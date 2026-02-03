import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle 
            className={`h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help inline-block ml-1 ${className || ''}`} 
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px]">
          <p className="text-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
