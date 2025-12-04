import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRefreshTrends } from "@/hooks/useTrendData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function TrendRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refreshAll } = useRefreshTrends();

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Trigger trend recalculation
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch(
          "https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/calculate-oura-trends",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_id: session.user.id }),
          }
        );

        if (response.ok) {
          // Refresh all trend queries
          refreshAll();
          toast({
            title: "Trends Updated",
            description: "Your health trends have been recalculated",
          });
        } else {
          throw new Error("Failed to recalculate trends");
        }
      }
    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "Refresh Failed",
        description: "Unable to update trends. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="gap-2"
    >
      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      {isRefreshing ? "Updating..." : "Refresh Trends"}
    </Button>
  );
}