import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Database, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { hasUploadedData, getAllProfiles, saveProfile, getActiveProfileId, setActiveProfileId, resetToDemo, ClientProfile, HealthDataRow } from "@/lib/healthDataStore";
import { useLiveData } from "@/contexts/LiveDataContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CsvUploader from "@/components/CsvUploader";
import { DemoProfileSelector } from "@/components/DemoProfileSelector";
import Papa from "papaparse";

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
  const { refreshData } = useLiveData();
  const [csvData, setCsvData] = useState<HealthDataRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isValidated, setIsValidated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeProfile, setActiveProfile] = useState(getActiveProfileId());
  const [profiles, setProfiles] = useState<ClientProfile[]>(getAllProfiles());
  const [newProfileName, setNewProfileName] = useState("");

  useEffect(() => {
    setProfiles(getAllProfiles());
  }, [activeProfile, csvData]);

  const parseCSV = (text: string): HealthDataRow[] => {
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
    const data: HealthDataRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        data.push(row as HealthDataRow);
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
    if (!newProfileName.trim()) {
      toast({
        title: "Profile name required",
        description: "Please enter a client profile name",
        variant: "destructive"
      });
      return;
    }

    const profile: ClientProfile = {
      id: `profile-${Date.now()}`,
      name: newProfileName.trim(),
      data: csvData
    };

    saveProfile(profile);
    setActiveProfile(profile.id);
    refreshData(); // Refresh the LiveDataContext
    
    toast({
      title: "Data applied successfully",
      description: `${csvData.length} rows for "${newProfileName}" are now active.`,
    });

    // Reset state
    setCsvData([]);
    setFileName("");
    setIsValidated(false);
    setNewProfileName("");
    setProfiles(getAllProfiles());
  };

  const handleClearData = () => {
    setCsvData([]);
    setFileName("");
    setIsValidated(false);
    setNewProfileName("");
    
    toast({
      title: "Upload cleared",
      description: "You can upload a new CSV file.",
    });
  };

  const handleProfileChange = (profileId: string) => {
    setActiveProfileId(profileId);
    setActiveProfile(profileId);
    refreshData(); // Refresh the LiveDataContext
    
    if (profileId === "demo") {
      toast({
        title: "Switched to Demo Data",
        description: "All dashboards now show demo values.",
      });
    } else {
      const profile = getAllProfiles().find(p => p.id === profileId);
      toast({
        title: "Profile Switched",
        description: `Now viewing data for "${profile?.name}"`,
      });
    }
    
    setProfiles(getAllProfiles());
  };

  const handleResetToDemo = () => {
    resetToDemo();
    setActiveProfile("demo");
    setProfiles([]);
    setCsvData([]);
    setFileName("");
    setIsValidated(false);
    refreshData(); // Refresh the LiveDataContext
    
    toast({
      title: "Reset Complete",
      description: "All data cleared. Using demo values.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-950 pb-32 pt-24 px-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-2xl mb-4">
            <Database className="text-primary" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Data Upload Center</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            View your demo athlete data or upload your own CSVs for analysis
          </p>
          
          {/* Session Status and Controls */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {hasUploadedData() ? (
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
            
            <Button
              onClick={handleResetToDemo}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Trash2 size={16} />
              Reset to Demo Data
            </Button>
          </div>
        </div>

        {/* Demo Athlete Profile Cards */}
        <DemoProfileSelector />

        {/* Dual Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cloud Upload Panel */}
          <Card className="p-8 bg-gray-900/80 backdrop-blur-xl border border-blue-500/20 shadow-xl shadow-blue-950/30">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Cloud Upload</h3>
                <p className="text-gray-400 text-sm">
                  Send your CSV to Supabase for cloud storage and processing.
                </p>
              </div>
              <CsvUploader />
            </div>
          </Card>

          {/* Live Analysis Panel */}
          <Card className="p-8 bg-gray-900/80 backdrop-blur-xl border border-blue-500/20 shadow-xl shadow-blue-950/30">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Live Analysis</h3>
                <p className="text-gray-400 text-sm">
                  Upload a CSV to test real-time graph changes instantly in Predictiv.
                </p>
              </div>
              <LocalCsvUploader refreshData={refreshData} />
            </div>
          </Card>
        </div>

        {/* Client Profile Selector */}
        <Card className="p-6 bg-gray-900/80 backdrop-blur-xl border border-blue-500/20 shadow-xl shadow-blue-950/30">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-primary" size={20} />
            <h3 className="text-lg font-semibold text-white">Select Client Profile</h3>
          </div>
          
          <Select value={activeProfile} onValueChange={handleProfileChange}>
            <SelectTrigger className="w-full bg-background/50">
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="demo">Demo Data (Default)</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name} ({profile.data.length} rows)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <p className="text-xs text-gray-400 mt-2">
            Switch between different client profiles. Each profile maintains its own data for this session.
          </p>
        </Card>

        {/* Upload Area */}
        <Card className="p-8 bg-gray-900/80 backdrop-blur-xl border border-blue-500/20 shadow-xl shadow-blue-950/30">
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
                          {row[col as keyof HealthDataRow]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Profile Name Input & Action Buttons */}
            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Client Profile Name
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g., John Doe, Athlete #123"
                  className="w-full px-4 py-2 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleApplyData}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={!newProfileName.trim()}
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
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// Local CSV Uploader Component for Live Analysis
const LocalCsvUploader = ({ refreshData }: { refreshData: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // Store in localStorage for live analysis
            localStorage.setItem('liveAnalysisData', JSON.stringify(results.data));
            
            toast({
              title: "✅ CSV loaded for live analysis",
              description: `Processed ${results.data.length} rows from ${file.name}`,
            });

            refreshData();
            setFile(null);
            setIsUploading(false);
          } catch (error: any) {
            toast({
              title: "Parse error",
              description: error.message || "Failed to process CSV data.",
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
        {isUploading ? "Processing..." : "Load for Live Analysis"}
      </Button>
    </div>
  );
};
