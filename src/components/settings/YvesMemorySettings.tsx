import { useState, useEffect, useCallback } from "react";
import { Brain, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface MemoryRow {
  id: string;
  memory_key: string;
  memory_value: unknown;
  last_updated: string;
}

// Map memory_key prefixes/patterns → display category
const CATEGORY_MAP: { label: string; keys: string[] }[] = [
  {
    label: "Training Preferences",
    keys: ["training", "sport", "workout", "session", "activity", "performance", "load", "acwr", "intensity"],
  },
  {
    label: "Health Patterns",
    keys: ["health", "hrv", "sleep", "recovery", "heart_rate", "spo2", "readiness", "anomaly", "symptom", "pattern"],
  },
  {
    label: "Goals",
    keys: ["goal", "target", "objective", "event", "race", "competition"],
  },
  {
    label: "Injury History",
    keys: ["injury", "pain", "rehab", "return_to_sport", "restriction", "load_restriction"],
  },
  {
    label: "Lifestyle",
    keys: ["lifestyle", "stress", "work", "sleep_schedule", "nutrition", "diet", "routine", "travel", "preference"],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Training Preferences": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Health Patterns": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Goals": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Injury History": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Lifestyle": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Other": "bg-muted/30 text-muted-foreground border-border",
};

function categorise(key: string): string {
  const lower = key.toLowerCase();
  for (const { label, keys } of CATEGORY_MAP) {
    if (keys.some((k) => lower.includes(k))) return label;
  }
  return "Other";
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    // Flatten simple objects into readable text
    const obj = value as Record<string, unknown>;
    const parts = Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => {
        const label = k.replace(/_/g, " ");
        return `${label}: ${Array.isArray(v) ? (v as unknown[]).join(", ") : v}`;
      });
    return parts.join(" · ") || JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const YvesMemorySettings = () => {
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const { toast } = useToast();

  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("yves_memory_bank")
        .select("id, memory_key, memory_value, last_updated")
        .eq("user_id", user.id)
        .order("last_updated", { ascending: false });
      if (!error && data) setMemories(data as MemoryRow[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("yves_memory_bank").delete().eq("id", id);
      if (error) throw error;
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Memory cleared", description: "Yves will no longer reference this insight." });
    } catch {
      toast({ title: "Failed to clear memory", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("yves_memory_bank").delete().eq("user_id", user.id);
      if (error) throw error;
      setMemories([]);
      toast({ title: "All Yves memory cleared", description: "Yves will start fresh on your next session." });
    } catch {
      toast({ title: "Failed to clear memory", variant: "destructive" });
    } finally {
      setIsClearingAll(false);
    }
  };

  // Group by category
  const grouped = memories.reduce<Record<string, MemoryRow[]>>((acc, m) => {
    const cat = categorise(m.memory_key);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  const categoryOrder = [
    "Training Preferences",
    "Health Patterns",
    "Goals",
    "Injury History",
    "Lifestyle",
    "Other",
  ];

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Brain size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">What Yves Knows About You</h3>
            <p className="text-xs text-muted-foreground">Insights Yves has learned from your data and conversations</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadMemories}
          disabled={isLoading}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Refresh memories"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted/20 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && memories.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <Brain size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Yves is still learning about you.</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Chat with Yves or complete more training sessions to build your profile.
          </p>
        </div>
      )}

      {/* Grouped memories */}
      {!isLoading && memories.length > 0 && (
        <div className="space-y-6">
          {categoryOrder.map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat]}`}>
                    {cat}
                  </span>
                  <span className="text-xs text-muted-foreground">{items.length} insight{items.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {items.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl bg-glass/30 border border-glass-border group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">
                          {formatKey(m.memory_key)}
                        </p>
                        <p className="text-sm text-foreground leading-snug break-words">
                          {formatValue(m.memory_value)}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Learned {formatDistanceToNow(new Date(m.last_updated), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="h-7 w-7 shrink-0 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Clear this memory"
                      >
                        {deletingId === m.id
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Clear all */}
          <div className="pt-2 border-t border-border/50">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isClearingAll}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                >
                  <Trash2 size={14} className="mr-2" />
                  {isClearingAll ? "Clearing…" : "Clear all Yves memory"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Clear all Yves memory?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {memories.length} insight{memories.length !== 1 ? "s" : ""} Yves has learned about you.
                    Yves will start fresh and personalisation will rebuild over time as you use the app.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Clear all memory
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
};
