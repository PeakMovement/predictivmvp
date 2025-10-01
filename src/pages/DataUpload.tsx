import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { hasUploadedData } from "@/lib/healthDataStore";

interface HealthData {
  Date: string;
  RestingHR: string;
  MaxHR: string;
  HRV: string;
  SleepHours: string;
  SleepScore: string;
  Strain: string;
  ACWR: string;
  Monotony: string;
  TrainingLoad: string;
  EWMA: string;
}

const requiredColumns = [
  "Date",
  "RestingHR",
  "MaxHR",
  "HRV",
  "SleepHours",
  "SleepScore",
  "Strain",
  "ACWR",
  "Monotony",
  "TrainingLoad",
  "EWMA"
];

export const DataUpload = () => {
  const [csvData, setCsvData] = useState<HealthData[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isValidated, setIsValidated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasActiveData, setHasActiveData] = useState(hasUploadedData());

  useEffect(() => {
    setHasActiveData(hasUploadedData());
  }, [csvData]);

  const parseCSV = (text: string): HealthData[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate headers
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      toast({
        title: "CSV missing required fields",
        description: `Missing columns: ${missingColumns.join(', ')}`,
        variant: "destructive"
      });
      throw new Error("Missing required columns");
    }

    // Parse data rows
    const data: HealthData[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        data.push(row as HealthData);
      }
    }
    
    return data;
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    setFileName(file.name);

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
        toast({
          title: "Empty CSV file",
          description: "The CSV file contains no data rows",
          variant: "destructive"
        });
        return;
      }

      setCsvData(parsedData);
      setIsValidated(true);
      
      toast({
        title: "CSV uploaded successfully",
        description: `${parsedData.length} rows loaded. Review data before applying.`,
      });
    } catch (error) {
      setCsvData([]);
      setIsValidated(false);
      console.error("CSV parsing error:", error);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleApplyData = () => {
    sessionStorage.setItem("uploadedHealthData", JSON.stringify(csvData));
    
    toast({
      title: "Data applied successfully",
      description: `${csvData.length} rows of health data are now active for this session.`,
    });

    // Reset state
    setCsvData([]);
    setFileName("");
    setIsValidated(false);
  };

  const handleClearData = () => {
    setCsvData([]);
    setFileName("");
    setIsValidated(false);
    
    toast({
      title: "Upload cleared",
      description: "You can upload a new CSV file.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-2xl mb-4">
            <Database className="text-primary" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Data Upload</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upload your health and training data via CSV to replace demo values
          </p>
          
          {/* Session Status Indicator */}
          {hasActiveData ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-400">
              <CheckCircle size={16} />
              <span>Active Session Data Loaded</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full text-sm text-amber-400">
              <AlertCircle size={16} />
              <span>Using Demo Data</span>
            </div>
          )}
        </div>

        {/* Upload Area */}
        <Card className="p-8 bg-glass backdrop-blur-xl border-glass-border shadow-glass">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300",
              isDragging 
                ? "border-primary bg-primary/10 scale-105" 
                : "border-border hover:border-primary/50 hover:bg-glass-highlight"
            )}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Upload className="text-primary" size={28} />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Drop your CSV file here
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse files
                </p>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <FileText size={16} className="mr-2" />
                    Choose CSV File
                  </span>
                </Button>
              </label>

              {fileName && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <FileText size={16} />
                  <span>{fileName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Required Columns Info */}
          <div className="mt-6 p-4 bg-secondary/50 rounded-xl">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-primary" />
              Required CSV Columns
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
              {requiredColumns.map((col) => (
                <div key={col} className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-green-500" />
                  {col}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Preview Table */}
        {isValidated && csvData.length > 0 && (
          <Card className="p-6 bg-glass backdrop-blur-xl border-glass-border shadow-glass animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Data Preview (First 5 Rows)</h3>
              <span className="text-sm text-muted-foreground">
                Total: {csvData.length} rows
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {requiredColumns.map((col) => (
                      <th key={col} className="text-left p-3 font-semibold text-foreground whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-glass-highlight transition-colors">
                      {requiredColumns.map((col) => (
                        <td key={col} className="p-3 text-muted-foreground whitespace-nowrap">
                          {row[col as keyof HealthData]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-border">
              <Button 
                onClick={handleApplyData}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <CheckCircle size={16} className="mr-2" />
                Apply Data
              </Button>
              <Button 
                onClick={handleClearData}
                variant="outline"
              >
                Clear Upload
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
