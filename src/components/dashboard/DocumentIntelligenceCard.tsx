import { FileText, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDocuments } from '@/hooks/useDocuments';

interface DocumentIntelligenceCardProps {
  onNavigate: (tab: string) => void;
}

export const DocumentIntelligenceCard = ({ onNavigate }: DocumentIntelligenceCardProps) => {
  const { documents, loading } = useDocuments();

  const documentCounts = {
    nutrition: documents.filter(d => d.document_type === 'nutrition' && d.processing_status === 'completed').length,
    medical: documents.filter(d => d.document_type === 'medical' && d.processing_status === 'completed').length,
    training: documents.filter(d => d.document_type === 'training' && d.processing_status === 'completed').length,
  };

  const latestInsight = documents
    .filter(d => d.ai_summary && d.processing_status === 'completed')
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];

  const totalDocuments = documentCounts.nutrition + documentCounts.medical + documentCounts.training;

  if (loading) {
    return null;
  }

  return (
    <Card className="bg-glass border-glass-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Your Health Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-card/50 rounded-lg">
            <div className="text-xl font-bold text-primary">{documentCounts.nutrition}</div>
            <div className="text-xs text-muted-foreground">🍽️ Nutrition</div>
          </div>
          <div className="text-center p-3 bg-card/50 rounded-lg">
            <div className="text-xl font-bold text-primary">{documentCounts.medical}</div>
            <div className="text-xs text-muted-foreground">🏥 Medical</div>
          </div>
          <div className="text-center p-3 bg-card/50 rounded-lg">
            <div className="text-xl font-bold text-primary">{documentCounts.training}</div>
            <div className="text-xs text-muted-foreground">💪 Training</div>
          </div>
        </div>

        {latestInsight && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">💡 Latest Insight:</p>
            <p className="text-xs line-clamp-2">
              {latestInsight.ai_summary}
            </p>
          </div>
        )}

        {totalDocuments === 0 && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Upload documents to get AI-powered insights
            </p>
          </div>
        )}

        <Button 
          className="w-full" 
          onClick={() => onNavigate('my-documents')}
          variant={totalDocuments === 0 ? "default" : "outline"}
        >
          <Upload className="w-4 h-4 mr-2" />
          {totalDocuments === 0 ? 'Upload First Document' : 'Manage Documents'}
        </Button>
      </CardContent>
    </Card>
  );
};
