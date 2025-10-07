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
      // Generate a unique filename (public uploads don't use user.id)
      const filePath = `${Date.now()}-${file.name}`;

      // ✅ Upload to public bucket using anon key
      const { data, error } = await supabase.storage.from("predictiv_data").upload(filePath, file, {
        upsert: true,
        cacheControl: "3600",
      });

      if (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log("✅ Upload success:", data);
        toast({
          title: "Upload successful",
          description: `${file.name} uploaded to predictiv_data bucket.`,
        });
      }

      setFile(null);
    } catch (err: any) {
      console.error("Unexpected error:", err);
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

        <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}
