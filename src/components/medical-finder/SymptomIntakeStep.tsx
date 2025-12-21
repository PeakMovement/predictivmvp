import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMedicalFinder } from '@/hooks/useMedicalFinder';
import { Stethoscope, AlertCircle, ArrowRight, Heart, Brain, Activity } from 'lucide-react';

export function SymptomIntakeStep() {
  const { analyzeSymptoms, isLoading } = useMedicalFinder();
  const [symptoms, setSymptoms] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (symptoms.trim().length < 10) return;
    await analyzeSymptoms(symptoms);
  };

  const examplePrompts = [
    "I've been having severe headaches for the past 3 days",
    "My chest feels tight when I exercise",
    "I have persistent fatigue and difficulty sleeping",
    "Sharp pain in my lower back that gets worse when sitting"
  ];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Describe Your Symptoms</CardTitle>
        <CardDescription className="text-muted-foreground mt-2">
          Tell us what you're experiencing in your own words. Be as detailed as possible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder="Describe your symptoms here... For example: I've been experiencing severe headaches for the past week, especially in the morning. They're accompanied by sensitivity to light and sometimes nausea."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="min-h-[150px] text-base resize-none border-border/50 bg-background/50 focus:border-primary"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {symptoms.length} characters
            </div>
          </div>

          {/* Example prompts */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Or try an example:</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSymptoms(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  disabled={isLoading}
                >
                  {prompt.substring(0, 30)}...
                </button>
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-lg font-medium"
            disabled={symptoms.trim().length < 10 || isLoading}
          >
            {isLoading ? (
              <>
                <Activity className="h-5 w-5 mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze Symptoms
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/30">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Heart className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">AI-Powered</p>
              <p className="text-xs text-muted-foreground">Advanced symptom analysis</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Brain className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Smart Matching</p>
              <p className="text-xs text-muted-foreground">Find the right specialist</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Emergency Detection</p>
              <p className="text-xs text-muted-foreground">Urgent care alerts</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          This tool is for informational purposes only and does not replace professional medical advice.
          Always consult with a healthcare provider for medical concerns.
        </p>
      </CardContent>
    </Card>
  );
}
