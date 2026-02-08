import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SymptomCheckInForm } from "@/components/symptoms/SymptomCheckInForm";
import { SymptomHistory } from "@/components/symptoms/SymptomHistory";
import { useHealthInterpretation } from "@/hooks/useHealthInterpretation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Stethoscope, Brain, AlertTriangle, CheckCircle, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SymptomCheckInSheet() {
  const [open, setOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [latestCheckinId, setLatestCheckinId] = useState<string | null>(null);
  const { interpretSymptom, interpretation, isLoading, error, clearInterpretation } =
    useHealthInterpretation();

  const handleSuccess = async (checkinId: string) => {
    setLatestCheckinId(checkinId);
    setRefreshTrigger((prev) => prev + 1);
    await interpretSymptom(checkinId);
  };

  const handleClear = () => {
    setLatestCheckinId(null);
    clearInterpretation();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <button
              className={cn(
                "fixed top-[140px] right-6 z-50",
                "w-12 h-12 rounded-xl bg-glass backdrop-blur-xl border-glass-border",
                "flex items-center justify-center",
                "hover:bg-glass-highlight hover:scale-110 active:scale-95",
                "transition-all duration-300 ease-out transform-gpu animate-fade-in",
              )}
              aria-label="Symptom Check In"
            >
              <Stethoscope size={20} className="text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
            </button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Symptom Check In</p>
        </TooltipContent>
      </Tooltip>

      <SheetContent side="right" className="w-full sm:max-w-lg p-0 border-border/50 bg-background">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/30">
          <SheetTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/20">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            Symptom Check In
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-88px)]">
          <div className="px-6 py-6 space-y-6">
            {/* Form */}
            <SymptomCheckInForm onSuccess={handleSuccess} onRequestClose={() => setOpen(false)} />

            {/* AI Interpretation Result */}
            {(latestCheckinId || isLoading) && (
              <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Health Interpretation
                  </CardTitle>
                  {interpretation && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClear}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isLoading && (
                    <div className="flex items-center gap-3 text-muted-foreground py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Analyzing your symptom with health context...</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 text-destructive py-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {interpretation && (
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-foreground text-sm">{interpretation.summary}</p>
                      </div>

                      {interpretation.flagged_conditions && interpretation.flagged_conditions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Flagged Conditions
                          </h4>
                          <ul className="space-y-1">
                            {interpretation.flagged_conditions.map((condition, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                                <span className="text-amber-500 mt-1">•</span>
                                {condition}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {interpretation.recommendations && interpretation.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            Recommendations
                          </h4>
                          <ul className="space-y-1">
                            {interpretation.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                                <span className="text-emerald-500 mt-1">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                        <Badge variant="secondary" className="text-xs">
                          {interpretation.confidence_score}% confidence
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Sources: {interpretation.data_sources_used.join(", ")}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* History */}
            <SymptomHistory refreshTrigger={refreshTrigger} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
