import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { YvesChat } from "@/components/YvesChat";

export function YvesChatSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <button
              className={cn(
                "fixed top-[200px] right-6 z-50",
                "w-12 h-12 rounded-xl bg-glass backdrop-blur-xl border-glass-border",
                "flex items-center justify-center",
                "hover:bg-glass-highlight hover:scale-110 active:scale-95",
                "transition-all duration-300 ease-out transform-gpu animate-fade-in",
              )}
              aria-label="Chat with Yves AI"
            >
              <Sparkles size={20} className="text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
            </button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Yves AI</p>
        </TooltipContent>
      </Tooltip>

      <SheetContent side="right" className="w-full sm:max-w-lg p-0 border-border/50 bg-background">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/30">
          <SheetTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Yves AI
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-88px)]">
          <div className="px-4 py-6">
            <YvesChat />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
