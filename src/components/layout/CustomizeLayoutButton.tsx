import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CustomizeLayoutButtonProps {
  onClick: () => void;
  isCustomized?: boolean;
}

export function CustomizeLayoutButton({ onClick, isCustomized }: CustomizeLayoutButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className="gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Customize Layout</span>
            {isCustomized && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Personalize how this page looks and feels</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
