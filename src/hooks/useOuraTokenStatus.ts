import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OuraTokenStatus {
  isConnected: boolean;
  isLoading: boolean;
  lastSync: Date | null;
  error: string | null;
  errorCode: string | null;
  checkConnection: () => Promise<void>;
}

/**
 * Hook to check Oura token status and auto-validate on load.
 * Used for token hydration and redirect logic.
 */
export const useOuraTokenStatus = (): OuraTokenStatus => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      // Check if user has Oura token in wearable_tokens (filter by Oura scope)
      const { data: tokenData, error: tokenError } = await supabase
        .from("wearable_tokens")
        .select("access_token, expires_at, scope")
        .eq("user_id", user.id)
        .ilike("scope", "%extapi%")
        .maybeSingle();

      if (tokenError) {
        console.warn("[useOuraTokenStatus] Token check error:", tokenError.message);
        setIsConnected(false);
        setError("Failed to check Oura connection");
        setErrorCode("CHECK_FAILED");
        setIsLoading(false);
        return;
      }

      if (!tokenData || !tokenData.access_token) {
        console.log("[useOuraTokenStatus] No Oura token found for user");
        setIsConnected(false);
        setError("Oura Ring not connected");
        setErrorCode("NO_TOKEN");
        setIsLoading(false);
        return;
      }

      // Check if token is expired
      if (tokenData.expires_at) {
        const expiresAt = new Date(tokenData.expires_at);
        const now = new Date();
        if (expiresAt <= now) {
          console.log("[useOuraTokenStatus] Oura token expired");
          setIsConnected(false);
          setError("Oura authorization expired");
          setErrorCode("TOKEN_EXPIRED");
          setIsLoading(false);
          return;
        }
      }

      // Token exists and is valid
      setIsConnected(true);

      // Fetch last successful sync from oura_logs
      const { data: logData } = await supabase
        .from("oura_logs")
        .select("created_at, entries_synced")
        .eq("user_id", user.id)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logData?.created_at) {
        setLastSync(new Date(logData.created_at));
      }

      setIsLoading(false);
    } catch (err) {
      console.error("[useOuraTokenStatus] Unexpected error:", err);
      setIsConnected(false);
      setError("Connection check failed");
      setErrorCode("UNEXPECTED_ERROR");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // Re-check when oura_logs changes (background sync completed)
    const channel = supabase
      .channel("oura-token-status")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "oura_logs",
        },
        () => {
          console.log("[useOuraTokenStatus] Oura log inserted, re-checking...");
          checkConnection();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkConnection]);

  return {
    isConnected,
    isLoading,
    lastSync,
    error,
    errorCode,
    checkConnection,
  };
};
