import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export const FitbitSyncNow = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncData, setSyncData] = useState<any>(null);

  const handleSync = async () => {
    console.log("Manual sync disabled - Fitbit OAuth removed");
    toast({
      title: "Authentication Removed",
      description: "Fitbit OAuth has been removed. Data sync requires reimplementation of authentication.",
      variant: "destructive",
    });
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
          <div className="flex items-center justify-center">
            <RefreshCw className={cn(
              "h-12 w-12 text-primary",
              isLoading && "animate-spin"
            )} />
          </div>
          
          <h1 className={cn(
            "text-4xl font-bold tracking-tight",
            "bg-gradient-to-r from-primary via-blue-400 to-teal-400",
            "bg-clip-text text-transparent",
            "drop-shadow-lg"
          )}>
            Manual Fitbit Sync
          </h1>
          
          <p className="text-muted-foreground text-lg">
            Fetch your latest Fitbit activity data instantly
          </p>
        </div>

        <div className="pt-4 space-y-4">
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
                Syncing your data...
              </>
            ) : syncSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Synced successfully!
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync Fitbit Data Now
              </>
            )}
          </Button>

          {syncSuccess && syncData && (
            <div className={cn(
              "p-6 rounded-lg space-y-3",
              "bg-green-500/20 border border-green-500/30",
              "animate-fade-in"
            )}>
              <div className="flex items-center justify-center gap-2 text-green-400 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                <p>Sync Complete!</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-black/20 rounded p-3">
                  <p className="text-muted-foreground">Steps</p>
                  <p className="text-2xl font-bold text-white">{syncData.steps?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-black/20 rounded p-3">
                  <p className="text-muted-foreground">Calories</p>
                  <p className="text-2xl font-bold text-white">{syncData.calories?.toLocaleString() || 0}</p>
                </div>
              </div>
              
              <p className="text-xs text-green-300/70">
                Synced at {new Date(syncData.synced_at).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 text-sm text-muted-foreground space-y-2">
          <p>💡 Your data automatically syncs every hour</p>
          <p>Use this for instant updates anytime</p>
        </div>
      </div>
    </div>
  );
};

export default FitbitSyncNow;
