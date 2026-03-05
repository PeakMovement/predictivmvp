import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle, XCircle, RefreshCw, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DiagnosticResult {
  label: string;
  status: 'success' | 'warning' | 'error';
  details: string;
}

export function BriefingDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        results.push({
          label: "User Authentication",
          status: "error",
          details: "Not authenticated"
        });
        setDiagnostics(results);
        setIsRunning(false);
        return;
      }

      results.push({
        label: "User Authentication",
        status: "success",
        details: `Authenticated as ${user.id}`
      });

      // Check wearable sessions
      const { data: sessions } = await supabase
        .from("wearable_sessions")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(7);

      if (!sessions || sessions.length === 0) {
        results.push({
          label: "Wearable Data",
          status: "error",
          details: "No wearable sessions found in the last 7 days"
        });
      } else {
        results.push({
          label: "Wearable Data",
          status: "success",
          details: `${sessions.length} sessions found, latest: ${sessions[0].date}`
        });
      }

      // Check data maturity
      const { data: maturity } = await supabase
        .from("user_data_maturity")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!maturity) {
        results.push({
          label: "Data Maturity",
          status: "warning",
          details: "No maturity calculation found - will be calculated on next briefing generation"
        });
      } else {
        results.push({
          label: "Data Maturity",
          status: maturity.maturity_level === 'insufficient' ? 'warning' : 'success',
          details: `Level: ${maturity.maturity_level}, Score: ${maturity.maturity_score}/100, Days: ${maturity.data_days}`
        });
      }

      // Check latest briefing
      const today = new Date().toISOString().split("T")[0];
      const { data: briefing } = await supabase
        .from("daily_briefings")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("category", "unified")
        .maybeSingle();

      if (!briefing) {
        results.push({
          label: "Today's Briefing",
          status: "warning",
          details: "No unified briefing found for today"
        });
      } else {
        const age = Date.now() - new Date(briefing.created_at).getTime();
        const ageMinutes = Math.round(age / 1000 / 60);
        results.push({
          label: "Today's Briefing",
          status: "success",
          details: `Generated ${ageMinutes} minutes ago, focus: ${briefing.focus_mode || 'none'}`
        });
      }

      // Check user profile
      const { data: profile } = await supabase
        .from("user_profile")
        .select("name, goals")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        results.push({
          label: "User Profile",
          status: "warning",
          details: "No profile found - complete your profile for better insights"
        });
      } else {
        results.push({
          label: "User Profile",
          status: "success",
          details: `Name: ${profile.name || 'Not set'}, Goals: ${profile.goals?.length || 0}`
        });
      }

    } catch (error) {
      console.error("Diagnostics error:", error);
      results.push({
        label: "Diagnostics Error",
        status: "error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  const forceRegenerateNow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Not authenticated",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Regenerating briefing",
        description: "This may take a moment..."
      });

      const { data, error } = await supabase.functions.invoke("generate-yves-intelligence", {
        body: {
          user_id: user.id,
          force_refresh: true,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: "Briefing regenerated successfully"
        });

        // Refresh the page to show new briefing
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(data?.error || "Failed to generate briefing");
      }
    } catch (error) {
      console.error("Force regenerate error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate briefing",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Only run diagnostics when the section is expanded
    if (isOpen && diagnostics.length === 0) {
      runDiagnostics();
    }
  }, [isOpen]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <button className="w-full text-left group">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Briefing Diagnostics
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </span>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    runDiagnostics();
                  }}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                  Run Check
                </Button>
              </CardTitle>
              <CardDescription className="mt-1.5">
                Check why your daily briefing content isn't changing
              </CardDescription>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {diagnostics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run diagnostics to see results...</p>
            ) : (
              <>
                {diagnostics.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{result.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">{result.details}</p>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <Button
                    onClick={forceRegenerateNow}
                    className="w-full"
                    variant="default"
                  >
                    Force Regenerate Briefing Now
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This will bypass cache and generate fresh content based on your latest data
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
