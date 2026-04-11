import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, Sparkles, X, Check } from "lucide-react";

interface CardPreference {
  id: string;
  label: string;
  description: string;
  emphasized: boolean;
}

interface CustomFocusEditorProps {
  cardPreferences: CardPreference[];
  onSave: (preferences: Record<string, boolean>) => void;
  onCancel: () => void;
}

export function CustomFocusEditor({
  cardPreferences,
  onSave,
  onCancel,
}: CustomFocusEditorProps) {
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    cardPreferences.reduce((acc, card) => ({ ...acc, [card.id]: card.emphasized }), {})
  );

  const toggleCard = (cardId: string) => {
    setPreferences(prev => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleSave = () => {
    onSave(preferences);
  };

  const emphasizedCount = Object.values(preferences).filter(Boolean).length;

  return (
    <Card className="p-6 bg-glass rounded-md border-glass-border">
      <div className="space-y-6">
        {/* Header with warm, supportive language */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-5 w-5 text-bioGreen" />
            <h3 className="text-lg font-semibold text-foreground">
              What feels important to you today?
            </h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Choose the areas you want to focus on. You can always change this whenever your needs shift.
          </p>
        </div>

        {/* Card selection grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cardPreferences.map((card) => {
            const isSelected = preferences[card.id];
            
            return (
              <button
                key={card.id}
                onClick={() => toggleCard(card.id)}
                className={cn(
                  "relative p-4 rounded-md border-2 transition-all duration-200 text-left",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  isSelected
                    ? "bg-bioGreen/10 border-bioGreen/50 "
                    : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Star className="h-4 w-4 text-bioGreen fill-emerald-500" />
                  </div>
                )}
                <div className="space-y-1">
                  <span className={cn(
                    "font-medium text-sm",
                    isSelected ? "text-bioGreen dark:text-bioGreen" : "text-foreground"
                  )}>
                    {card.label}
                  </span>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {card.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Gentle guidance */}
        <div className="text-center">
          {emphasizedCount === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="h-4 w-4" />
              Tap the areas that matter most to you right now
            </p>
          ) : (
            <p className="text-sm text-bioGreen dark:text-bioGreen">
              {emphasizedCount === 1 
                ? "One area selected. Your dashboard will highlight this for you."
                : `${emphasizedCount} areas selected. Your dashboard will bring these forward.`
              }
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2 bg-bioGreen hover:bg-emerald-600 text-white"
          >
            <Check className="h-4 w-4" />
            Save my focus
          </Button>
        </div>
      </div>
    </Card>
  );
}
