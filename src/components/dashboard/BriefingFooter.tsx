import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface BriefingFooterProps {
  className?: string;
}

export function BriefingFooter({ className }: BriefingFooterProps) {
  const [factors, setFactors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDataSources() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const collectedFactors: string[] = [];

        // Check for wearable data (trend duration)
        const { data: sessions } = await supabase
          .from("wearable_sessions")
          .select("date")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(30);

        if (sessions && sessions.length > 0) {
          if (sessions.length >= 14) {
            collectedFactors.push("your trends over the past few weeks");
          } else if (sessions.length >= 7) {
            collectedFactors.push("your recent week of activity");
          } else {
            collectedFactors.push("your recent daily patterns");
          }
        }

        // Check for symptom history
        const { data: symptoms } = await supabase
          .from("symptom_check_ins")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (symptoms && symptoms.length > 0) {
          collectedFactors.push("past check ins you have shared");
        }

        // Check for uploaded documents
        const { data: documents } = await supabase
          .from("user_documents")
          .select("id")
          .eq("user_id", user.id)
          .eq("processing_status", "completed")
          .limit(1);

        if (documents && documents.length > 0) {
          collectedFactors.push("documents you have uploaded");
        }

        // Check for user profile and goals
        const { data: profile } = await supabase
          .from("user_profile")
          .select("goals")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.goals && profile.goals.length > 0) {
          collectedFactors.push("the goals you have set");
        }

        // Check for lifestyle context
        const { data: lifestyle } = await supabase
          .from("user_lifestyle")
          .select("stress_level")
          .eq("user_id", user.id)
          .maybeSingle();

        if (lifestyle?.stress_level) {
          collectedFactors.push("your current context");
        }

        setFactors(collectedFactors);
      } catch (error) {
        console.error("Error fetching data sources:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDataSources();
  }, []);

  if (isLoading || factors.length === 0) {
    return null;
  }

  // Build the sentence naturally
  const buildSentence = () => {
    if (factors.length === 1) {
      return `This guidance reflects ${factors[0]}.`;
    } else if (factors.length === 2) {
      return `This guidance reflects ${factors[0]} and ${factors[1]}.`;
    } else {
      const lastFactor = factors[factors.length - 1];
      const otherFactors = factors.slice(0, -1).join(", ");
      return `This guidance reflects ${otherFactors}, and ${lastFactor}.`;
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-2 pt-3 mt-2 border-t border-border/30",
      className
    )}>
      <Info className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        {buildSentence()}
      </p>
    </div>
  );
}
