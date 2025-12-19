import { useEffect, useState } from "react";
import { useRiskAlertTrigger } from "@/hooks/useRiskAlertTrigger";
import { AlertCheckInFlow } from "./AlertCheckInFlow";

interface RiskAlertPopupProps {
  onNavigateToHelp?: () => void;
}

export function RiskAlertPopup({ onNavigateToHelp }: RiskAlertPopupProps) {
  const { currentAlert, dismissAlert } = useRiskAlertTrigger();
  const [showFlow, setShowFlow] = useState(false);

  useEffect(() => {
    if (currentAlert) {
      // Small delay for animation
      const timer = setTimeout(() => setShowFlow(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowFlow(false);
    }
  }, [currentAlert]);

  if (!currentAlert || !showFlow) return null;

  const handleComplete = () => {
    setShowFlow(false);
    dismissAlert();
  };

  return (
    <AlertCheckInFlow
      alert={{
        metric: currentAlert.metric,
        value: currentAlert.value,
        threshold: currentAlert.threshold,
        message: currentAlert.message,
        type: currentAlert.type
      }}
      onComplete={handleComplete}
      onNavigateToHelp={onNavigateToHelp}
    />
  );
}
