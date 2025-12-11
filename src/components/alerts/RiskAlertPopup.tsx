import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Stethoscope, Bell } from "lucide-react";
import { useRiskAlertTrigger } from "@/hooks/useRiskAlertTrigger";

interface RiskAlertPopupProps {
  onCheckIn: () => void;
}

export function RiskAlertPopup({ onCheckIn }: RiskAlertPopupProps) {
  const { currentAlert, dismissAlert } = useRiskAlertTrigger();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (currentAlert) {
      // Small delay for animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [currentAlert]);

  if (!currentAlert) return null;

  const handleCheckIn = () => {
    onCheckIn();
    dismissAlert();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(dismissAlert, 300);
  };

  const getAlertStyles = () => {
    switch (currentAlert.type) {
      case "high_risk":
        return "bg-destructive/20 border-destructive/50";
      case "red_flag":
        return "bg-orange-500/20 border-orange-500/50";
      default:
        return "bg-yellow-500/20 border-yellow-500/50";
    }
  };

  const getAlertIcon = () => {
    switch (currentAlert.type) {
      case "high_risk":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "red_flag":
        return <Bell className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div 
      className={`fixed inset-x-4 bottom-24 z-50 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <Card className={`${getAlertStyles()} backdrop-blur-xl max-w-lg mx-auto`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getAlertIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-foreground text-sm">
                  {currentAlert.metric} Alert
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {currentAlert.message}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCheckIn} className="gap-1">
                  <Stethoscope className="h-3 w-3" />
                  Log Symptoms
                </Button>
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
