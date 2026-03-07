import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { YvesChat } from "@/components/YvesChat";
import { useIsMobile } from "@/hooks/use-mobile";

export function YvesChatSheet() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button
              className={cn(
                "fixed z-50",
                isMobile
                  ? "bottom-24 right-4"
                  : "top-[200px] right-6",
                "w-12 h-12 rounded-xl bg-glass backdrop-blur-xl border-glass-border",
                "flex items-center justify-center",
                "hover:bg-glass-highlight hover:scale-110 active:scale-95",
                "transition-all duration-300 ease-out transform-gpu animate-fade-in",
                "touch-manipulation",
              )}
              aria-label="Chat with Yves AI"
            >
              <Sparkles size={20} className="text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Yves AI</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className={cn(
        "p-0 overflow-hidden border-border/50 bg-background shadow-xl",
        isMobile
          ? "inset-0 top-0 left-0 right-0 bottom-0 w-full h-full max-w-none max-h-none rounded-none translate-x-0 translate-y-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
          : "sm:max-w-lg max-h-[80vh] rounded-2xl"
      )}>
        <DialogHeader className={cn(
          "px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-border/30 shrink-0",
          isMobile && "pt-[calc(1rem+env(safe-area-inset-top))]"
        )}>
          <DialogTitle className="flex items-center gap-3 text-foreground text-base sm:text-lg">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Yves AI
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className={cn(
          "flex-1 min-h-0",
          isMobile ? "h-[calc(100vh-88px)]" : "max-h-[calc(80vh-88px)]"
        )}>
          <div className="px-4 py-4 sm:py-6">
            <YvesChat compact={isMobile} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
