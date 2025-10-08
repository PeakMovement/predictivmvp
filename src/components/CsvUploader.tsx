import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

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
      const filePath = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("predictiv_data")
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Parse CSV and insert into health_data
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const samples = results.data.map((row: any) => {
              const sample: any = {};
              Object.keys(row).forEach((key) => {
                if (key.toLowerCase() !== 'date') {
                  sample[key] = {
                    value: parseFloat(row[key]) || row[key],
                    unit: "auto"
                  };
                }
              });
              return {
                date: row.date || row.Date || new Date().toISOString(),
                metrics: sample
              };
            });

            const { error: dbError } = await supabase
              .from("health_data")
              .insert({
                user_id: "anon_upload",
                samples: samples,
                collected_at: new Date().toISOString()
              });

            if (dbError) {
              toast({
                title: "Database error",
                description: dbError.message,
                variant: "destructive",
              });
              setIsUploading(false);
              return;
            }

            toast({
              title: "✅ CSV data successfully saved to health_data table.",
              description: `Processed ${results.data.length} rows from ${file.name}`,
            });

            setFile(null);
            setIsUploading(false);
          } catch (parseError: any) {
            toast({
              title: "Parse error",
              description: parseError.message || "Failed to process CSV data.",
              variant: "destructive",
            });
            setIsUploading(false);
          }
        },
        error: (error) => {
          toast({
            title: "CSV parsing failed",
            description: error.message,
            variant: "destructive",
          });
          setIsUploading(false);
        }
      });
    } catch (err: any) {
      toast({
        title: "Unexpected error",
        description: err.message || "An error occurred during upload.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:transition-colors file:cursor-pointer"
          disabled={isUploading}
        />
      </div>

      {file && (
        <p className="text-sm text-gray-400">
          Selected: <span className="text-white font-medium">{file.name}</span>
        </p>
      )}

      <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading..." : "Upload to Cloud"}
      </Button>
    </div>
  );
}
