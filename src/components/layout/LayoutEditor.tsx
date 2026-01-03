import { useState, useRef } from 'react';
import { GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SectionConfig } from '@/hooks/useLayoutCustomization';

interface LayoutEditorProps {
  sections: SectionConfig[];
  onSave: (sections: SectionConfig[]) => void;
  onCancel: () => void;
  onReset: () => void;
  onToggleVisibility: (sectionId: string) => void;
  onMoveUp: (sectionId: string) => void;
  onMoveDown: (sectionId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function LayoutEditor({
  sections,
  onSave,
  onCancel,
  onReset,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onReorder,
}: LayoutEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '0.5';
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === toIndex) return;
    onReorder(draggedIndex, toIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  return (
    <Card className="bg-gradient-to-br from-background via-background to-primary/5 border-2 border-primary/20 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Customize Your Layout</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Make this page feel just right for you
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            Drag sections to reorder, or use the arrows
          </p>
          <p className="flex items-center gap-2 mt-1">
            <Eye className="w-4 h-4" />
            Toggle visibility to focus on what matters most
          </p>
        </div>

        {/* Section List */}
        <div className="space-y-2">
          {sections.map((section, index) => (
            <div
              key={section.id}
              ref={index === draggedIndex ? dragNodeRef : null}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragLeave={handleDragLeave}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                "bg-background/80 hover:bg-background cursor-grab active:cursor-grabbing",
                section.visible 
                  ? "border-border hover:border-primary/50" 
                  : "border-muted bg-muted/20 opacity-70",
                draggedIndex === index && "opacity-50 scale-[0.98]",
                dragOverIndex === index && draggedIndex !== index && "border-primary border-2 scale-[1.02]"
              )}
            >
              {/* Drag Handle */}
              <div className="text-muted-foreground hover:text-foreground transition-colors">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Section Name */}
              <div className="flex-1 font-medium text-foreground">
                {section.name}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                {/* Move Up */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onMoveUp(section.id)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>

                {/* Move Down */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onMoveDown(section.id)}
                  disabled={index === sections.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {/* Toggle Visibility */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    section.visible ? "text-primary" : "text-muted-foreground"
                  )}
                  onClick={() => onToggleVisibility(section.id)}
                >
                  {section.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to default
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSave(sections)}>
              <Check className="w-4 h-4 mr-2" />
              Save layout
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
