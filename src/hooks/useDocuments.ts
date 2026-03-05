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
  parsed_content: Record<string, unknown>;
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
    void fetchDocuments();

    // Set up user-scoped real-time subscription
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      channel = supabase
        .channel('user_documents_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_documents',
            filter: `user_id=eq.${user.id}` // Filter by user_id for defense-in-depth
          },
          () => {
            fetchDocuments();
          }
        )
        .subscribe();
    };
    
    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const uploadDocument = async (
    file: File,
    documentType: 'nutrition' | 'medical' | 'training'
  ) => {
    setUploading(true);
    try {
      console.log('[Upload] Step 1: Starting upload for:', file.name);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate file type
      const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported. Please upload PDF, TXT, JPG, PNG, or DOCX files.`);
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      console.log('[Upload] Validation passed');

      // Upload file to storage
      console.log('[Upload] Step 2: Uploading to storage...');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('user_documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL (1 hour expiry)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('user_documents')
        .createSignedUrl(fileName, 3600);

      if (urlError) throw urlError;
      const fileUrl = signedUrlData.signedUrl;
      console.log('[Upload] Generated signed URL:', fileUrl.substring(0, 50) + '...');

      // Create document record
      console.log('[Upload] Step 3: Creating database record...');
      const { data: document, error: dbError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Read file content for AI analysis
      console.log('[Upload] Reading file content...');
      let fileContent: string;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      // Text files: read directly
      if (['txt', 'csv', 'md'].includes(fileExtension || '')) {
        fileContent = await file.text();
        console.log('[Upload] Read text file, length:', fileContent.length);
      }
      // Binary files: convert to base64 + send metadata
      else {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        fileContent = JSON.stringify({
          type: 'binary',
          encoding: 'base64',
          data: base64.substring(0, 50000), // Limit to ~50KB
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        });
        console.log('[Upload] Converted binary file to base64, size:', base64.length);
      }

      // Trigger AI analysis
      console.log('[Upload] Step 4: Invoking analyze-document function...');
      const { error: analysisError } = await supabase.functions.invoke('analyze-document', {
        body: {
          documentId: document.id,
          userId: user.id,
          documentType,
          fileContent: fileContent
        }
      });

      console.log('[Upload] Step 5: Analysis complete, response:', analysisError ? 'FAILED' : 'SUCCESS');

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
