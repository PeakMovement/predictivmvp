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

export function YvesChatSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
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
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Yves AI</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg max-h-[80vh] p-0 rounded-2xl overflow-hidden border-border/50 bg-background shadow-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30">
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Yves AI
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-88px)]">
          <div className="px-4 py-6">
            <YvesChat />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
