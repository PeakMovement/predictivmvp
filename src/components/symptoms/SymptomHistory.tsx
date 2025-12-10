import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Symptom {
  id: string;
  symptom_type: string;
  severity: string;
  description: string | null;
  body_location: string | null;
  triggers: string[] | null;
  created_at: string;
}

interface SymptomHistoryProps {
  refreshTrigger?: number;
}

export const SymptomHistory = ({ refreshTrigger }: SymptomHistoryProps) => {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSymptoms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("symptom_check_ins")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSymptoms(data || []);
    } catch (error) {
      console.error("Error fetching symptoms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSymptoms();
  }, [refreshTrigger]);

  const deleteSymptom = async (id: string) => {
    try {
      const { error } = await supabase
        .from("symptom_check_ins")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSymptoms((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: "Symptom deleted",
        description: "The symptom entry has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete symptom",
        variant: "destructive",
      });
    }
  };

  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity.toLowerCase()) {
      case "mild":
        return "secondary";
      case "moderate":
        return "default";
      case "severe":
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatSymptomType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent Symptoms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <History className="h-5 w-5 text-primary" />
          Recent Symptoms
        </CardTitle>
      </CardHeader>
      <CardContent>
        {symptoms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No symptoms logged yet</p>
            <p className="text-sm text-muted-foreground/70">
              Use the form above to log how you're feeling
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {symptoms.map((symptom) => (
              <div
                key={symptom.id}
                className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 border border-border/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">
                      {formatSymptomType(symptom.symptom_type)}
                    </span>
                    <Badge variant={getSeverityVariant(symptom.severity)}>
                      {symptom.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {symptom.body_location && (
                      <p>Location: {formatSymptomType(symptom.body_location)}</p>
                    )}
                    {symptom.triggers && symptom.triggers.length > 0 && (
                      <p>Triggers: {symptom.triggers.join(", ")}</p>
                    )}
                    {symptom.description && (
                      <p className="text-xs italic">"{symptom.description}"</p>
                    )}
                    <p className="text-xs">
                      {format(new Date(symptom.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSymptom(symptom.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
