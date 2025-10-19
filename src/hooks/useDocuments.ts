import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserDocument {
  id: string;
  user_id: string;
  document_type: 'nutrition' | 'medical' | 'training';
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
  parsed_content: any;
  ai_summary: string | null;
  tags: string[] | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

export const useDocuments = () => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as UserDocument[]) || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('user_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_documents'
        },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const uploadDocument = async (
    file: File,
    documentType: 'nutrition' | 'medical' | 'training'
  ) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('user_documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_documents')
        .getPublicUrl(fileName);

      // Create document record
      const { data: document, error: dbError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Read file content for AI analysis
      const fileContent = await file.text();

      // Trigger AI analysis
      const { error: analysisError } = await supabase.functions.invoke('analyze-document', {
        body: {
          documentId: document.id,
          userId: user.id,
          documentType,
          fileContent: fileContent.substring(0, 10000) // Limit to first 10k chars
        }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        toast({
          title: 'Upload Successful',
          description: 'Document uploaded but AI analysis failed. You can retry later.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Document uploaded and AI analysis started',
        });
      }

      await fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user_documents')
        .remove([filePath]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast({
        title: 'Deleted',
        description: 'Document removed successfully',
      });

      await fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
};
