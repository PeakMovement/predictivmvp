import { useState } from 'react';
import { FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDocuments, type UserDocument } from '@/hooks/useDocuments';
import { formatDistanceToNow } from 'date-fns';

export function MedicalDocumentsSection() {
  const { documents, uploading, uploadDocument, deleteDocument } = useDocuments();
  const [dragActive, setDragActive] = useState(false);

  const medicalDocuments = documents.filter(doc => doc.document_type === 'medical');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    await uploadDocument(file, 'medical');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Medical Documents
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Upload lab results, prescriptions, medical reports
          </p>
        </div>
        <Badge variant="secondary">{medicalDocuments.length} files</Badge>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="medical-file-upload"
          className="hidden"
          onChange={handleFileInput}
          accept=".pdf,.txt,.jpg,.jpeg,.png,.docx"
          disabled={uploading}
        />
        <label
          htmlFor="medical-file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className={`h-8 w-8 mb-2 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm text-center">
            {uploading ? (
              <span className="text-primary">Uploading...</span>
            ) : (
              <>
                <span className="font-medium">Click to upload</span> or drag and drop
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, TXT, JPG, PNG, DOCX (max 10MB)
          </p>
        </label>
      </div>

      {/* Documents List */}
      {medicalDocuments.length > 0 && (
        <div className="space-y-2">
          {medicalDocuments.map((doc) => (
            <Card key={doc.id} className="bg-muted/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                      </span>
                      {doc.file_size && (
                        <>
                          <span>•</span>
                          <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                        </>
                      )}
                      <Badge
                        variant={
                          doc.processing_status === 'completed'
                            ? 'default'
                            : doc.processing_status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs px-1.5 py-0"
                      >
                        {doc.processing_status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteDocument(doc.id, doc.file_url)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {medicalDocuments.length === 0 && (
        <p className="text-xs text-center text-muted-foreground py-4">
          No medical documents uploaded yet
        </p>
      )}
    </div>
  );
}
