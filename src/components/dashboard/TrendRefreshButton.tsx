import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRefreshTrends } from "@/hooks/useTrendData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MIN_REFRESH_INTERVAL = 10000; // 10 seconds minimum between refreshes

export function TrendRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refreshAll } = useRefreshTrends();
  const lastRefreshRef = useRef<number>(0);

  const handleRefresh = useCallback(async () => {
    // Debounce rapid clicks
    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) {
      const remainingSeconds = Math.ceil((MIN_REFRESH_INTERVAL - (now - lastRefreshRef.current)) / 1000);
      toast({
        title: "Please wait",
        description: `Refresh available in ${remainingSeconds}s`,
      });
      return;
    }

    setIsRefreshing(true);
    lastRefreshRef.current = now;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Not authenticated",
          description: "Please log in to refresh trends",
          variant: "destructive",
        });
        return;
      }

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
        refreshAll();
        toast({
          title: "Trends Updated",
          description: "Your health trends have been recalculated",
        });
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error("[TrendRefreshButton] Error:", error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Unable to update trends",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAll]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="gap-2 transition-all duration-300 hover:bg-primary/10"
      aria-label="Refresh health trends"
    >
      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      {isRefreshing ? "Updating..." : "Refresh Trends"}
    </Button>
  );
}