import { FileText, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserDocument } from '@/hooks/useDocuments';
import { format } from 'date-fns';

interface DocumentCardProps {
  document: UserDocument;
  onDelete: (id: string, fileUrl: string) => void;
}

const typeIcons = {
  nutrition: '🍽️',
  medical: '🏥',
  training: '💪'
};

const typeLabels = {
  nutrition: 'Nutrition Plan',
  medical: 'Medical Record',
  training: 'Training Program'
};

const statusIcons = {
  pending: <Clock className="w-4 h-4 text-muted-foreground" />,
  processing: <Clock className="w-4 h-4 text-primary animate-pulse" />,
  completed: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <AlertCircle className="w-4 h-4 text-destructive" />
};

export const DocumentCard = ({ document, onDelete }: DocumentCardProps) => {
  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{typeIcons[document.document_type]}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-sm truncate">{document.file_name}</h4>
                <p className="text-xs text-muted-foreground">
                  {typeLabels[document.document_type]}
                </p>
              </div>
            </div>

            {document.ai_summary && document.processing_status === 'completed' && (
              <div className="bg-primary/10 p-3 rounded-md">
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {document.ai_summary}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusIcons[document.processing_status]}
                <span className="text-xs text-muted-foreground capitalize">
                  {document.processing_status}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(document.uploaded_at), 'MMM d, yyyy')}
              </span>
            </div>

            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {document.tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(document.id, document.file_url)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
