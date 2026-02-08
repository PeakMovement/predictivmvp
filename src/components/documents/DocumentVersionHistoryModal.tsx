import { useState, useEffect } from 'react';
import { Clock, RotateCcw, Download, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserDocument } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  file_size: number | null;
  ai_summary: string | null;
  tags: string[] | null;
  created_at: string;
  restored_from_version: number | null;
}

interface DocumentVersionHistoryModalProps {
  document: UserDocument | null;
  open: boolean;
  onClose: () => void;
  onRestored?: () => void;
}

export function DocumentVersionHistoryModal({
  document,
  open,
  onClose,
  onRestored,
}: DocumentVersionHistoryModalProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<number | null>(null);

  useEffect(() => {
    if (document && open) {
      loadVersionHistory();
    }
  }, [document, open]);

  const loadVersionHistory = async () => {
    if (!document) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', document.id)
        .order('version_number', { ascending: false });

      if (error) throw error;

      setVersions(data || []);
    } catch (error) {
      console.error('Failed to load version history:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!document) return;

    setRestoring(true);
    try {
      const { data, error } = await supabase.rpc('restore_document_version', {
        p_document_id: document.id,
        p_version_number: versionNumber,
        p_user_id: document.user_id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; restored_version?: number; new_version?: number };

      if (!result.success) {
        throw new Error(result.error || 'Failed to restore version');
      }

      toast.success(`Version ${versionNumber} restored successfully`);
      setVersionToRestore(null);
      onRestored?.();
      await loadVersionHistory();
    } catch (error) {
      console.error('Failed to restore version:', error);
      const message = error instanceof Error ? error.message : 'Failed to restore version';
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  };

  const handleDownloadVersion = (version: DocumentVersion) => {
    const link = document.createElement('a');
    link.href = version.file_url;
    link.download = version.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Download started');
  };

  if (!document) return null;

  const currentVersion = document.version || 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of {document.file_name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-primary/5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">Current Version {currentVersion}</Badge>
                        {document.version_notes && (
                          <span className="text-xs text-muted-foreground">
                            {document.version_notes}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1">{document.file_name}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(document.uploaded_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        {document.file_size && (
                          <span>{(document.file_size / 1024).toFixed(1)} KB</span>
                        )}
                      </div>
                      {document.ai_summary && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {document.ai_summary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No previous versions found</p>
                    <p className="text-xs mt-1">
                      Previous versions will appear here when you upload a new version of this document
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Previous Versions
                    </h4>
                    {versions.map((version) => (
                      <div key={version.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Version {version.version_number}</Badge>
                              {version.restored_from_version && (
                                <span className="text-xs text-muted-foreground">
                                  (Restored from v{version.restored_from_version})
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">{version.file_name}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                              </span>
                              {version.file_size && (
                                <span>{(version.file_size / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                            {version.ai_summary && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {version.ai_summary}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadVersion(version)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVersionToRestore(version.version_number)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={versionToRestore !== null} onOpenChange={() => setVersionToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version {versionToRestore}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new version with the content from version {versionToRestore}.
              Your current version will be preserved in the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => versionToRestore && handleRestoreVersion(versionToRestore)}
              disabled={restoring}
            >
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Version'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
