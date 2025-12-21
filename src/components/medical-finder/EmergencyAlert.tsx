import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, X } from 'lucide-react';

interface EmergencyAlertProps {
  onDismiss: () => void;
}

export function EmergencyAlert({ onDismiss }: EmergencyAlertProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-destructive/10 border-2 border-destructive rounded-2xl p-6 animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Alert Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-destructive/20 animate-pulse">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">
            Emergency Detected
          </h2>
          <p className="text-foreground">
            Based on your symptoms, you may need immediate medical attention.
          </p>

          {/* Emergency Action */}
          <a
            href="tel:911"
            className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold text-lg transition-colors"
          >
            <Phone className="h-6 w-6" />
            Call 911 Now
          </a>

          {/* Symptoms that triggered */}
          <div className="p-4 rounded-lg bg-muted/30 text-left">
            <p className="text-sm font-medium mb-2">If you're experiencing:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Chest pain or difficulty breathing</li>
              <li>• Signs of stroke (sudden numbness, confusion)</li>
              <li>• Severe bleeding or loss of consciousness</li>
              <li>• Severe allergic reaction</li>
            </ul>
          </div>

          {/* Dismiss option */}
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            My symptoms are not life-threatening — Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
