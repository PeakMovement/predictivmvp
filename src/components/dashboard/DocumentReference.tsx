import { FileText, ExternalLink } from 'lucide-react';
import { RelevantDocument } from '@/hooks/useRelevantDocuments';
import { cn } from '@/lib/utils';

interface DocumentReferenceProps {
  document: RelevantDocument;
  className?: string;
}

export function DocumentReference({ document, className }: DocumentReferenceProps) {
  const handleClick = () => {
    window.open(document.fileUrl, '_blank', 'noopener,noreferrer');
  };

  // Format display name (remove extension for cleaner look)
  const displayName = document.fileName.replace(/\.[^/.]+$/, '');
  const yearDisplay = document.year ? ` (${document.year})` : '';

  return (
    <button
      onClick={handleClick}
      className={cn(
        'mt-2 w-full text-left rounded-md p-2.5 transition-colors',
        'bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20',
        'group cursor-pointer',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">
              {displayName}
              {yearDisplay}
            </span>
            <ExternalLink className="h-3 w-3 shrink-0 text-amber-600/60 dark:text-amber-400/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-[11px] text-amber-700/70 dark:text-amber-400/60 mt-0.5 leading-relaxed">
            This document {document.relevanceReason}. Your care history helps personalize today's guidance.
          </p>
        </div>
      </div>
    </button>
  );
}
