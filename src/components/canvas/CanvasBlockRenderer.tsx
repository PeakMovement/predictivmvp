import { ReactNode } from 'react';
import { CanvasBlock } from '@/hooks/usePersonalCanvas';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { LayoutBlockSize } from '@/hooks/useLayoutCustomization';

interface CanvasBlockRendererProps {
  block: CanvasBlock;
  children: ReactNode;
  isEditing: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onResize: (size: LayoutBlockSize) => void;
  onToggleVisibility: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const sizeStyles: Record<LayoutBlockSize, string> = {
  compact: 'max-w-2xl',
  standard: 'max-w-4xl',
  wide: 'max-w-full',
};

export function CanvasBlockRenderer({
  block,
  children,
  isEditing,
  onRemove,
  onMoveUp,
  onMoveDown,
  onResize,
  onToggleVisibility,
  isFirst,
  isLast,
}: CanvasBlockRendererProps) {
  if (!block.visible && !isEditing) {
    return null;
  }

  const nextSize = (): LayoutBlockSize => {
    if (block.size === 'compact') return 'standard';
    if (block.size === 'standard') return 'wide';
    return 'compact';
  };

  return (
    <div
      className={cn(
        'relative w-full transition-all',
        sizeStyles[block.size],
        !block.visible && 'opacity-50',
        isEditing && 'ring-2 ring-primary/20 rounded-lg'
      )}
    >
      {isEditing && (
        <div className="absolute -top-3 left-0 right-0 flex items-center justify-between px-2 z-10">
          <div className="flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-sm">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{block.name}</span>
          </div>
          <div className="flex items-center gap-1 bg-card border border-border rounded-full px-1 py-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveUp}
              disabled={isFirst}
              title="Move up"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveDown}
              disabled={isLast}
              title="Move down"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onResize(nextSize())}
              title="Change size"
            >
              {block.size === 'wide' ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleVisibility}
              title={block.visible ? "Hide section" : "Show section"}
            >
              {block.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={onRemove}
              title="Remove from canvas"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      <div className={cn(isEditing && 'pt-6')}>
        {children}
      </div>
    </div>
  );
}
