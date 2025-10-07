import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file first.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Authentication required",
          description: "Please log in to upload files.",
          variant: "destructive",
        });
        return;
      }

      // Upload file to storage
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("predictiv_data")
        .upload(path, file);

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        return;
      }

      // Record upload in database
      const { error: dbError } = await supabase
        .from("csv_uploads")
        .insert({
          user_id: user.id,
          file_url: path,
        });

      if (dbError) {
        toast({
          title: "Database error",
          description: dbError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully.`,
      });

      setFile(null);
    } catch (err: any) {
      toast({
        title: "Unexpected error",
        description: err.message || "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-6 bg-card/50 backdrop-blur">
      <h2 className="text-xl font-semibold mb-4 text-foreground">Upload Your CSV</h2>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1 text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:transition-colors"
            disabled={isUploading}
          />
        </div>

        {file && (
          <p className="text-sm text-muted-foreground">
            Selected: <span className="text-foreground font-medium">{file.name}</span>
          </p>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}
