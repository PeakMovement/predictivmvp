import { AlertTriangle, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RecoveryTrend {
  acwr: number | null;
  strain: number | null;
  monotony: number | null;
  recovery_score: number | null;
  period_date: string;
}

export const RiskScoreCard = () => {
  const [trends, setTrends] = useState<RecoveryTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecoveryTrends = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      const { data } = await supabase
        .from("recovery_trends")
        .select("acwr, strain, monotony, recovery_score, period_date")
        .eq("user_id", user.id)
        .gte("period_date", cutoffDate.toISOString().split("T")[0])
        .order("period_date", { ascending: false });
      
      setTrends(data || []);
      setIsLoading(false);
    };
    
    fetchRecoveryTrends();
  }, []);
  
  // Calculate Risk Score from 7-day averages using recovery_trends (correct ACWR data)
  const { riskScore, riskLevel, metrics } = useMemo(() => {
    if (trends.length === 0) {
      return { riskScore: 0, riskLevel: "unknown", metrics: { acwr: 0, strain: 0, fatigueIndex: 0 } };
    }
    
    const validAcwr = trends.filter(t => t.acwr !== null);
    const validStrain = trends.filter(t => t.strain !== null);
    const validMonotony = trends.filter(t => t.monotony !== null);
    
    const avgACWR = validAcwr.length > 0 ? validAcwr.reduce((sum, t) => sum + (t.acwr || 0), 0) / validAcwr.length : 0;
    const avgStrain = validStrain.length > 0 ? validStrain.reduce((sum, t) => sum + (t.strain || 0), 0) / validStrain.length : 0;
    const avgMonotony = validMonotony.length > 0 ? validMonotony.reduce((sum, t) => sum + (t.monotony || 0), 0) / validMonotony.length : 0;
    
    // Fatigue Index: (Strain / 200) × 50 + (Monotony / 3) × 50
    const fatigueIndex = Math.min(100, Math.round((avgStrain / 200) * 50 + (avgMonotony / 3) * 50));
    
    // Risk Score calculation
    let score = 0;
    if (avgACWR > 1.5) score += 40;
    else if (avgACWR > 1.3) score += 25;
    else if (avgACWR > 1.0) score += 10;
    
    if (avgStrain > 150) score += 30;
    else if (avgStrain > 100) score += 15;
    
    if (fatigueIndex > 70) score += 30;
    else if (fatigueIndex > 50) score += 15;
    
    const finalScore = Math.min(100, score);
    
    let level: "low" | "moderate" | "high" | "unknown" = "low";
    if (finalScore > 60) level = "high";
    else if (finalScore > 30) level = "moderate";
    
    return { 
      riskScore: finalScore, 
      riskLevel: level,
      metrics: { acwr: avgACWR, strain: avgStrain, fatigueIndex }
    };
  }, [trends]);
  
  const getIcon = () => {
    switch (riskLevel) {
      case "high": return <ShieldAlert size={24} className="text-red-400" />;
      case "moderate": return <Shield size={24} className="text-yellow-400" />;
      case "low": return <ShieldCheck size={24} className="text-green-400" />;
      default: return <Shield size={24} className="text-muted-foreground" />;
    }
  };
  
  const getStatusColor = () => {
    switch (riskLevel) {
      case "high": return "text-red-400 bg-red-500/20 border-red-500/30";
      case "moderate": return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
      case "low": return "text-green-400 bg-green-500/20 border-green-500/30";
      default: return "text-muted-foreground bg-muted/20 border-muted/30";
    }
  };
  
  const getProgressColor = () => {
    switch (riskLevel) {
      case "high": return "bg-red-500";
      case "moderate": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-muted";
    }
  };
  
  const getMessage = () => {
    switch (riskLevel) {
      case "high": return "High injury risk detected. Consider reducing training intensity.";
      case "moderate": return "Moderate risk. Monitor recovery and adjust if needed.";
      case "low": return "Low risk. Training load is well balanced.";
      default: return "Connect your device to calculate risk score.";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-pulse">
        <div className="h-6 bg-muted/30 rounded w-1/3 mb-4" />
        <div className="h-16 bg-muted/30 rounded w-full" />
      </div>
    );
  }

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center border",
            getStatusColor()
          )}>
            {getIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Risk Score</h3>
            <p className="text-xs text-muted-foreground">7-day injury risk assessment</p>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-full text-sm font-semibold border",
          getStatusColor()
        )}>
          {riskLevel === "unknown" ? "—" : riskScore}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", getProgressColor())}
            style={{ width: `${riskScore}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Low</span>
          <span>Moderate</span>
          <span>High</span>
        </div>
      </div>
      
      {/* Status Message */}
      <div className={cn(
        "p-3 rounded-lg border text-sm",
        getStatusColor()
      )}>
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{getMessage()}</span>
        </div>
      </div>
      
      {/* Contributing Factors */}
      {riskLevel !== "unknown" && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-glass/30 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">ACWR</p>
            <p className={cn(
              "text-sm font-semibold",
              metrics.acwr > 1.3 ? "text-yellow-400" : metrics.acwr > 1.5 ? "text-red-400" : "text-foreground"
            )}>{metrics.acwr.toFixed(2)}</p>
          </div>
          <div className="bg-glass/30 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Strain</p>
            <p className={cn(
              "text-sm font-semibold",
              metrics.strain > 150 ? "text-red-400" : metrics.strain > 100 ? "text-yellow-400" : "text-foreground"
            )}>{metrics.strain.toFixed(0)}</p>
          </div>
          <div className="bg-glass/30 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Fatigue</p>
            <p className={cn(
              "text-sm font-semibold",
              metrics.fatigueIndex > 70 ? "text-red-400" : metrics.fatigueIndex > 50 ? "text-yellow-400" : "text-foreground"
            )}>{metrics.fatigueIndex}%</p>
          </div>
        </div>
      )}
    </div>
  );
};
