import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Check } from 'lucide-react';
import { blockLibrary, CanvasBlock } from '@/hooks/usePersonalCanvas';
import { PageId } from '@/hooks/useLayoutCustomization';
import { cn } from '@/lib/utils';

interface BlockLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBlock: (sourcePageId: PageId, sourceSectionId: string, name: string) => void;
  existingBlocks: CanvasBlock[];
}

export function BlockLibrary({ open, onOpenChange, onAddBlock, existingBlocks }: BlockLibraryProps) {
  const isBlockAdded = (pageId: PageId, sectionId: string) => {
    return existingBlocks.some(
      b => b.sourcePageId === pageId && b.sourceSectionId === sectionId
    );
  };

  const handleAddBlock = (pageId: PageId, sectionId: string, name: string) => {
    onAddBlock(pageId, sectionId, name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add a Section</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose from your favorite sections across the app. Each section stays connected to its original data source.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(blockLibrary).map(([category, { pageId, blocks }]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  {category}
                </h3>
                <div className="grid gap-2">
                  {blocks.map((block) => {
                    const added = isBlockAdded(pageId, block.id);
                    return (
                      <div
                        key={block.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border transition-colors",
                          added
                            ? "bg-primary/5 border-primary/20"
                            : "bg-card border-border hover:border-primary/30 hover:bg-accent/50"
                        )}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <h4 className="font-medium text-foreground">{block.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {block.description}
                          </p>
                        </div>
                        <Button
                          variant={added ? "outline" : "default"}
                          size="sm"
                          disabled={added}
                          onClick={() => handleAddBlock(pageId, block.id, block.name)}
                          className="shrink-0"
                        >
                          {added ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
