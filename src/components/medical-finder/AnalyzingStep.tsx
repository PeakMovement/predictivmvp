import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useMedicalFinder } from '@/hooks/useMedicalFinder';
import { Loader2, Brain, Search, FileText } from 'lucide-react';

export function AnalyzingStep() {
  const { currentStep } = useMedicalFinder();
  
  const isAnalyzing = currentStep === 'analyzing';
  const isMatching = currentStep === 'matching';

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="py-16 flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative p-6 rounded-full bg-primary/10 border border-primary/30">
            {isAnalyzing ? (
              <Brain className="h-12 w-12 text-primary" />
            ) : isMatching ? (
              <Search className="h-12 w-12 text-primary" />
            ) : (
              <FileText className="h-12 w-12 text-primary" />
            )}
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">
            {isAnalyzing && 'Analyzing Your Symptoms'}
            {isMatching && 'Finding Best Matches'}
            {!isAnalyzing && !isMatching && 'Processing...'}
          </h3>
          <p className="text-muted-foreground max-w-md">
            {isAnalyzing && 'Our AI is evaluating your symptoms to determine severity and recommend the right specialists...'}
            {isMatching && 'Searching our database to find the best healthcare providers for your needs...'}
            {!isAnalyzing && !isMatching && 'Please wait while we process your request...'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>This usually takes a few seconds</span>
        </div>

        {/* Animated progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary/50"
              style={{
                animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
