import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Activity, RefreshCw, MessageSquare, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { YvesChatSheet } from "@/components/YvesChatSheet";

export const QuickActionsPanel = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { toast } = useToast();

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to sync your data",
          variant: "destructive",
        });
        return;
      }

      // Detect connected wearable provider(s)
      const { data: tokens, error: tokensError } = await supabase
        .from("wearable_tokens")
        .select("scope")
        .eq("user_id", user.id);

      if (tokensError) throw tokensError;

      if (!tokens || tokens.length === 0) {
        toast({
          title: "No device connected",
          description: "Connect a wearable device in Settings first",
        });
        return;
      }

      // Map provider scope to edge function name
      const providerFunctionMap: Record<string, string> = {
        oura: "fetch-oura-data",
        garmin: "fetch-garmin-data",
        polar: "fetch-polar-sleep",
      };

      const deviceNames: Record<string, string> = { oura: "Oura Ring", garmin: "Garmin", polar: "Polar" };
      const succeeded: string[] = [];
      const failed: string[] = [];

      for (const token of tokens) {
        const functionName = providerFunctionMap[token.scope];
        if (!functionName) {
          console.warn(`[sync] Unknown provider: ${token.scope}`);
          continue;
        }

        const { error } = await supabase.functions.invoke(functionName, {
          body: token.scope === "oura"
            ? { userId: user.id }
            : { user_id: user.id },
        });

        const label = deviceNames[token.scope] ?? token.scope;
        if (error) {
          console.error(`[sync] ${token.scope} sync failed:`, error);
          failed.push(label);
        } else {
          succeeded.push(label);
        }
      }

      if (failed.length > 0 && succeeded.length === 0) {
        toast({
          title: "Sync failed",
          description: `Couldn't reach ${failed.join(" or ")}. Check your connection and try again, or reconnect in Settings.`,
          variant: "destructive",
        });
      } else if (failed.length > 0) {
        toast({
          title: "Partially synced",
          description: `${succeeded.join(" & ")} updated. ${failed.join(" & ")} failed — try reconnecting in Settings.`,
        });
      } else {
        toast({
          title: "Sync complete",
          description: `${succeeded.join(" & ")} data is up to date.`,
        });
      }
    } catch (error: any) {
      console.error('Error syncing data:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Unable to sync data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const actions = [
    {
      id: "log-symptom",
      icon: Activity,
      label: "Log Symptom",
      description: "Record how you feel",
      onClick: () => window.dispatchEvent(new Event("open-symptom-checkin")),
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      hoverColor: "hover:bg-blue-500/20",
    },
    {
      id: "sync-data",
      icon: isSyncing ? Loader2 : RefreshCw,
      label: "Sync Data",
      description: "Update Oura data",
      onClick: handleSyncData,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      hoverColor: "hover:bg-green-500/20",
      spinning: isSyncing,
    },
    {
      id: "chat-yves",
      icon: MessageSquare,
      label: "Chat with Yves",
      description: "Ask anything",
      onClick: () => setIsChatOpen(true),
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      hoverColor: "hover:bg-purple-500/20",
    },
    {
      id: "view-plan",
      icon: Calendar,
      label: "View Plan",
      description: "See your schedule",
      href: "/your-plan",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      hoverColor: "hover:bg-amber-500/20",
    },
  ];

  return (
    <>
      <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const content = (
              <div
                className={`
                  flex flex-col items-center justify-center p-4 rounded-lg
                  ${action.bgColor} ${action.hoverColor}
                  transition-all duration-200 cursor-pointer
                  hover:scale-105 active:scale-95
                  border border-transparent hover:border-border/50
                `}
              >
                <Icon
                  className={`h-6 w-6 mb-2 ${action.color} ${action.spinning ? 'animate-spin' : ''}`}
                />
                <span className="text-sm font-medium text-foreground text-center">
                  {action.label}
                </span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  {action.description}
                </span>
              </div>
            );

            if (action.href) {
              return (
                <Link key={action.id} to={action.href}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.spinning}
                className="w-full"
              >
                {content}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Yves Chat Sheet */}
      <YvesChatSheet />
    </>
  );
};
