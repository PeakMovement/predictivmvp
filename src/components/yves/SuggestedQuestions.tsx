import { Sparkles } from "lucide-react";

const CHIPS = [
  "How is my recovery today?",
  "Should I train hard tomorrow?",
  "What does my sleep data say?",
];

interface SuggestedQuestionsProps {
  /** Called when chip is tapped — sets the query text */
  onSelectQuestion: (question: string) => void;
  /** If provided, tapping a chip also triggers an immediate send */
  onSend?: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ onSelectQuestion, onSend, disabled }: SuggestedQuestionsProps) {
  const handleTap = (q: string) => {
    onSelectQuestion(q);
    if (onSend) onSend(q);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium uppercase tracking-wide">Ask Yves</span>
      </div>
      <div className="flex flex-col gap-2">
        {CHIPS.map((q) => (
          <button
            key={q}
            disabled={disabled}
            onClick={() => handleTap(q)}
            className="w-full text-left rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground hover:bg-muted/60 hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
