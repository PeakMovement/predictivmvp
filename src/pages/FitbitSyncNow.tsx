import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export const FitbitSyncNow = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleSync = async () => {
    console.log("Starting Fitbit sync...");
    setIsLoading(true);
    setSyncSuccess(false);

    try {
      const response = await fetch("/.netlify/functions/fetch-fitbit-auto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("Fitbit sync response:", data);

      if (response.ok) {
        console.log("✅ Sync successful!");
        setSyncSuccess(true);
        toast({
          title: "Success!",
          description: data.message || "Fitbit data auto-synced successfully",
        });
        
        // Reset success message after 3 seconds
        setTimeout(() => setSyncSuccess(false), 3000);
      } else {
        console.error("❌ Sync failed:", data);
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync Fitbit data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Sync error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("Fitbit sync completed.");
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center",
      "bg-gradient-to-br from-blue-500/10 via-teal-500/10 to-cyan-500/10",
      "p-6"
    )}>
      <div className={cn(
        "max-w-md w-full space-y-8 text-center",
        "bg-glass backdrop-blur-xl border-glass-border",
        "rounded-2xl p-8 shadow-glass",
        "animate-fade-in"
      )}>
        <div className="space-y-4">
          <h1 className={cn(
            "text-4xl font-bold tracking-tight",
            "bg-gradient-to-r from-primary via-blue-400 to-teal-400",
            "bg-clip-text text-transparent",
            "drop-shadow-lg"
          )}>
            Manual Fitbit Sync
          </h1>
          
          <p className="text-muted-foreground text-lg">
            Press the button below to fetch your latest Fitbit data now.
          </p>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSync}
            disabled={isLoading}
            size="lg"
            className={cn(
              "w-full relative overflow-hidden",
              "bg-primary hover:bg-primary/90",
              "shadow-glow hover:shadow-glow-lg",
              "transition-all duration-300",
              syncSuccess && "bg-green-500 hover:bg-green-500"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Syncing...
              </>
            ) : syncSuccess ? (
              <>
                ✅ Synced successfully!
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync Fitbit Data
              </>
            )}
          </Button>
        </div>

        {syncSuccess && (
          <div className={cn(
            "mt-4 p-4 rounded-lg",
            "bg-green-500/20 border border-green-500/30",
            "animate-fade-in"
          )}>
            <p className="text-green-400 font-medium">
              Your Fitbit data has been successfully synced!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FitbitSyncNow;
