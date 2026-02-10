import { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText, Image as ImageIcon, File } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserDocument } from '@/hooks/useDocuments';
import { toast } from 'sonner';

interface DocumentPreviewModalProps {
  document: UserDocument | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  document,
  open,
  onClose,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'text' | 'unsupported'>('unsupported');
  const [textContent, setTextContent] = useState('');

  useEffect(() => {
    if (document && open) {
      detectFileType();
      if (fileType === 'text') {
        loadTextContent();
      }
    }
  }, [document, open]);

  const detectFileType = () => {
    if (!document) return;

    const extension = document.file_name.split('.').pop()?.toLowerCase();
    const mimeType = document.file_url.includes('pdf') ? 'pdf' : extension;

    if (extension === 'pdf' || mimeType === 'pdf') {
      setFileType('pdf');
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      setFileType('image');
    } else if (['txt', 'md', 'csv', 'json'].includes(extension || '')) {
      setFileType('text');
    } else {
      setFileType('unsupported');
    }

    setLoading(false);
  };

  const loadTextContent = async () => {
    if (!document) return;

    try {
      const response = await fetch(document.file_url);
      const text = await response.text();
      setTextContent(text);
    } catch (error) {
      console.error('Failed to load text content:', error);
      toast.error('Failed to load document content');
      setTextContent('Failed to load content');
    }
  };

  const handleDownload = () => {
    if (!document) return;

    const link = window.document.createElement('a');
    link.href = document.file_url;
    link.download = document.file_name;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);

    toast.success('Download started');
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-8 w-8" />;
      case 'image':
        return <ImageIcon className="h-8 w-8" />;
      case 'text':
        return <FileText className="h-8 w-8" />;
      default:
        return <File className="h-8 w-8" />;
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">{getFileIcon()}</div>
              <div>
                <DialogTitle className="text-xl">{document.file_name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {document.file_size ? `${(document.file_size / 1024).toFixed(1)} KB` : 'Size unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={onClose} variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden rounded-lg border bg-muted/50 mt-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fileType === 'pdf' ? (
            <iframe
              src={document.file_url}
              className="w-full h-full"
              title={document.file_name}
            />
          ) : fileType === 'image' ? (
            <div className="h-full overflow-auto p-4 flex items-center justify-center">
              <img
                src={document.file_url}
                alt={document.file_name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : fileType === 'text' ? (
            <div className="h-full overflow-auto p-6">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                {textContent || 'Loading...'}
              </pre>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <File className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Preview Not Available</h3>
              <p className="text-muted-foreground mb-4">
                This file type cannot be previewed directly in the browser.
              </p>
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download to View
              </Button>
            </div>
          )}
        </div>

        {document.ai_summary && document.processing_status === 'completed' && (
          <div className="flex-shrink-0 mt-4 p-4 bg-primary/10 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">AI Summary</h4>
            <p className="text-sm text-muted-foreground">{document.ai_summary}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
