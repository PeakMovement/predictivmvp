import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentUploadZoneProps {
  documentType: 'nutrition' | 'medical' | 'training';
  onUpload: (file: File, type: 'nutrition' | 'medical' | 'training') => void;
  uploading: boolean;
  icon: string;
  title: string;
  description: string;
}

export const DocumentUploadZone = ({
  documentType,
  onUpload,
  uploading,
  icon,
  title,
  description
}: DocumentUploadZoneProps) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      onUpload(file, documentType);
    }
  }, [documentType, onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, documentType);
    }
  }, [documentType, onUpload]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 text-center transition-all hover:border-primary/50",
        "bg-card/50 hover:bg-card border-border",
        uploading && "opacity-50 pointer-events-none"
      )}
    >
      <input
        type="file"
        id={`upload-${documentType}`}
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        disabled={uploading}
      />
      
      <label
        htmlFor={`upload-${documentType}`}
        className="cursor-pointer flex flex-col items-center gap-4"
      >
        <div className="text-5xl">{icon}</div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2 text-primary text-sm">
          <Upload className="w-4 h-4" />
          <span>Drop file or click to upload</span>
        </div>
      </label>

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};
