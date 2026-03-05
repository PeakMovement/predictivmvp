import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Brain } from 'lucide-react';

interface TreatmentPlanInputProps {
  onGenerate: (input: string) => void;
  isLoading?: boolean;
}

export function TreatmentPlanInput({ onGenerate, isLoading }: TreatmentPlanInputProps) {
  const [userInput, setUserInput] = useState('');

  const handleSubmit = () => {
    if (userInput.trim()) {
      onGenerate(userInput.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setUserInput(example);
    onGenerate(example);
  };

  const examples = [
    'Chronic lower back pain for 3 months, budget R3000, Johannesburg',
    'Anxiety and stress management, prefer online sessions, R2500/month',
    'Post-injury knee rehabilitation, need physiotherapy, Durban, R4000',
    'Weight loss program with nutrition support, Cape Town, R3500',
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">AI Treatment Plan Generator</CardTitle>
          </div>
          <CardDescription>
            Describe your health concerns, budget, and location to get personalized treatment recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Describe your health needs
            </label>
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Example: I have lower back pain for 2 months, budget R3000, located in Johannesburg..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Include: symptoms, duration, budget, location, and any preferences
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!userInput.trim() || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Your Plan...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Treatment Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Try these examples</h3>
        </div>
        <div className="grid gap-2">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="text-left px-4 py-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
