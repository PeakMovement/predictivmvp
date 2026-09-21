import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EscalationCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
}

interface EscalationRule {
  id: string;
  rule_name: string;
  description: string;
  conditions: EscalationCondition[];
  require_all: boolean;
  escalation_type: 'in_app_alert' | 'sms' | 'email' | 'provider_referral';
  severity: 'info' | 'warning' | 'critical';
  message_template: string;
  cooldown_hours: number;
  enabled: boolean;
}

interface TriggeredRule {
  rule_id: string;
  rule_name: string;
  severity: string;
  escalation_type: string;
  message: string;
  matched_conditions: EscalationCondition[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body.user_id || null;
    } catch {
      // No body
    }

    if (!userId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Fetch enabled escalation rules
    const { data: rules, error: rulesError } = await supabase
      .from("escalation_rules")
      .select("*")
      .eq("enabled", true);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ success: true, triggered: false, rules_evaluated: 0, message: "No enabled rules" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user metrics for evaluation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const [
      wearableSessionsResult,
      trainingTrendsResult,
      recoveryTrendsResult,
      userDeviationsResult,
      recentEscalationsResult,
    ] = await Promise.all([
      supabase.from("wearable_sessions").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("training_trends").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }),
      supabase.from("recovery_trends").select("*").eq("user_id", userId).gte("period_date", sevenDaysAgoStr).order("period_date", { ascending: false }),
      supabase.from("user_deviations").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }),
      supabase.from("escalation_log").select("rule_id, created_at").eq("user_id", userId).gte("created_at", sevenDaysAgo.toISOString()),
    ]);

    const wearableSessions = wearableSessionsResult.data || [];
    const trainingTrends = trainingTrendsResult.data || [];
    const recoveryTrends = recoveryTrendsResult.data || [];
    const userDeviations = userDeviationsResult.data || [];
    const recentEscalations = recentEscalationsResult.data || [];

    // Build metrics object for evaluation
    const latestSession = wearableSessions[0];
    const latestTraining = trainingTrends[0];
    const latestRecovery = recoveryTrends[0];

    // Calculate consecutive days for certain metrics
    let consecutiveLowReadiness = 0;
    let consecutiveLowSleep = 0;
    for (const session of wearableSessions) {
      if (session.readiness_score !== null && session.readiness_score < 40) {
        consecutiveLowReadiness++;
      } else break;
    }
    for (const session of wearableSessions) {
      if (session.sleep_score !== null && session.sleep_score < 60) {
        consecutiveLowSleep++;
      } else break;
    }

    // Calculate HRV deviation from baseline
    const hrvDeviation = userDeviations.find(d => d.metric === 'hrv');
    const hrvDeviationPct = hrvDeviation?.deviation || 0;

    const metrics: Record<string, number | null> = {
      readiness_score: latestSession?.readiness_score || null,
      sleep_score: latestSession?.sleep_score || null,
      hrv: latestSession?.hrv_avg || null,
      resting_hr: latestSession?.resting_hr || null,
      acwr: latestTraining?.acwr || latestRecovery?.acwr || null,
      strain: latestRecovery?.strain || null,
      monotony: latestRecovery?.monotony || null,
      acute_load: latestRecovery?.acute_load || null,
      chronic_load: latestRecovery?.chronic_load || null,
      consecutive_days: Math.max(consecutiveLowReadiness, consecutiveLowSleep),
      hrv_deviation_pct: hrvDeviationPct,
    };


    // Evaluate each rule
    const triggeredRules: TriggeredRule[] = [];
    const now = new Date();

    for (const rule of rules as EscalationRule[]) {
      // Check cooldown
      const recentTrigger = recentEscalations.find(e => e.rule_id === rule.id);
      if (recentTrigger) {
        const triggerTime = new Date(recentTrigger.created_at);
        const hoursSinceTrigger = (now.getTime() - triggerTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceTrigger < rule.cooldown_hours) {
          continue;
        }
      }

      // Evaluate conditions
      const conditions = rule.conditions as EscalationCondition[];
      const matchedConditions: EscalationCondition[] = [];

      for (const condition of conditions) {
        const metricValue = metrics[condition.metric];
        if (metricValue === null || metricValue === undefined) continue;

        let conditionMet = false;
        switch (condition.operator) {
          case '>': conditionMet = metricValue > condition.value; break;
          case '<': conditionMet = metricValue < condition.value; break;
          case '>=': conditionMet = metricValue >= condition.value; break;
          case '<=': conditionMet = metricValue <= condition.value; break;
          case '==': conditionMet = metricValue === condition.value; break;
          case '!=': conditionMet = metricValue !== condition.value; break;
        }

        if (conditionMet) {
          matchedConditions.push(condition);
        }
      }

      // Check if rule triggered
      const allConditionsMet = matchedConditions.length === conditions.length;
      const someConditionsMet = matchedConditions.length > 0;
      const ruleTriggered = rule.require_all ? allConditionsMet : someConditionsMet;

      if (ruleTriggered && conditions.length > 0) {
        // Build message from template
        let message = rule.message_template;
        for (const [key, value] of Object.entries(metrics)) {
          if (value !== null) {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
          }
        }

        triggeredRules.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          severity: rule.severity,
          escalation_type: rule.escalation_type,
          message,
          matched_conditions: matchedConditions,
        });

      }
    }

    // Log triggered rules and take actions
    for (const triggered of triggeredRules) {
      // Log to escalation_log
      await supabase.from("escalation_log").insert({
        user_id: userId,
        rule_id: triggered.rule_id,
        rule_name: triggered.rule_name,
        triggered_conditions: triggered.matched_conditions,
        escalation_type: triggered.escalation_type,
        severity: triggered.severity,
        message: triggered.message,
      });

      // Take action based on escalation type
      if (triggered.escalation_type === 'sms' && triggered.severity === 'critical') {
        // Trigger SMS alert
        try {
          await supabase.functions.invoke("send-sms-alert", {
            body: { user_id: userId, message: triggered.message }
          });
        } catch (smsError) {
          console.error(`[evaluate-escalation-rules] SMS error:`, smsError);
        }
      }

      if (triggered.escalation_type === 'email') {
        // Trigger email alert
        try {
          await supabase.functions.invoke("send-risk-email", {
            body: { user_id: userId, alert_message: triggered.message, severity: triggered.severity }
          });
        } catch (emailError) {
          console.error(`[evaluate-escalation-rules] Email error:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        triggered: triggeredRules.length > 0,
        rules_evaluated: rules.length,
        rules_triggered: triggeredRules.length,
        triggered_rules: triggeredRules,
        metrics_used: metrics,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[evaluate-escalation-rules] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
