import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WearableSourceContextValue {
  /** The currently active source filter ("garmin" | "oura" | "auto") */
  activeSource: string;
  /** Set the active source and persist to localStorage */
  setActiveSource: (source: string) => void;
  /** Sources that the current user actually has connected */
  availableSources: string[];
  /** Whether we're still loading available sources */
  isLoadingSources: boolean;
  /** Resolved source: when activeSource is "auto", returns the first available source */
  resolvedSource: string | null;
}

const WearableSourceContext = createContext<WearableSourceContextValue | null>(null);

const STORAGE_KEY = "predictiv_wearable_source";

export function WearableSourceProvider({ children }: { children: ReactNode }) {
  const [activeSource, setActiveSourceState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "auto";
    } catch {
      return "auto";
    }
  });
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);

  const setActiveSource = useCallback((source: string) => {
    setActiveSourceState(source);
    try {
      localStorage.setItem(STORAGE_KEY, source);
    } catch {
      // Private browsing or quota exceeded
    }
  }, []);

  // Detect which sources the user has connected
  useEffect(() => {
    let cancelled = false;

    const detectSources = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Oura and Garmin live in wearable_tokens (scope column);
        // Polar has its own polar_tokens table. Query both.
        const [{ data: tokens }, { data: polarToken }] = await Promise.all([
          supabase.from("wearable_tokens").select("scope").eq("user_id", user.id),
          supabase.from("polar_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
        ]);

        if (cancelled) return;

        const scopes = (tokens || [])
          .map(t => t.scope)
          .filter(s => ["oura", "garmin", "polar"].includes(s));
        if (polarToken) scopes.push("polar");

        // Deduplicate
        const uniqueSources = [...new Set(scopes)];
        setAvailableSources(uniqueSources);

        // If user had selected a source that's no longer connected, reset to auto
        if (activeSource !== "auto" && !uniqueSources.includes(activeSource)) {
          setActiveSource("auto");
        }

        // If only one source is available and user is on "auto", auto-select it
        if (uniqueSources.length === 1 && activeSource === "auto") {
          setActiveSource(uniqueSources[0]);
        }
      } catch (err) {
        console.error("[WearableSource] Error detecting sources:", err);
      } finally {
        if (!cancelled) setIsLoadingSources(false);
      }
    };

    detectSources();

    // Re-detect when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      detectSources();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [activeSource, setActiveSource]);

  // Resolve "auto" to a concrete source
  const resolvedSource = activeSource === "auto"
    ? (availableSources[0] || null)
    : activeSource;

  return (
    <WearableSourceContext.Provider
      value={{
        activeSource,
        setActiveSource,
        availableSources,
        isLoadingSources,
        resolvedSource,
      }}
    >
      {children}
    </WearableSourceContext.Provider>
  );
}

export function useWearableSource() {
  const ctx = useContext(WearableSourceContext);
  if (!ctx) {
    throw new Error("useWearableSource must be used within a WearableSourceProvider");
  }
  return ctx;
}
