import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2, Shield, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExportFormat = "json" | "csv";

export const DataPrivacySettings = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const { toast } = useToast();

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to export data");
      }

      toast({
        title: "Preparing Export",
        description: "Gathering your data... This may take a moment.",
      });

      const { data, error } = await supabase.functions.invoke("export-user-data", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        method: "GET",
      });

      if (error) throw error;

      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: exportFormat === "json" ? "application/json" : "text/csv",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `predictiv-data-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Your data has been downloaded as a ${exportFormat.toUpperCase()} file.`,
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a complete copy of all your health data, including wearable metrics,
            symptoms, documents, and AI interactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON (Recommended)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Spreadsheet)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {exportFormat === "json"
                ? "JSON format includes all data with complete structure and relationships."
                : "CSV format is best for viewing in spreadsheets like Excel."}
            </p>
          </div>

          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Your export will include:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Profile information</li>
                  <li>Wearable data (sessions and daily summaries)</li>
                  <li>Symptom check-ins</li>
                  <li>Uploaded documents (metadata only)</li>
                  <li>Daily briefings and insights</li>
                  <li>AI chat history with Yves</li>
                  <li>Health profile and context</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Your privacy and data security are our top priorities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">End-to-End Encryption</p>
              <p>All your data is encrypted in transit and at rest.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Data Ownership</p>
              <p>You own your health data. Export or delete it anytime.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">HIPAA Compliant</p>
              <p>Our infrastructure meets healthcare data protection standards.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">No Third-Party Sharing</p>
              <p>We never sell or share your personal health information.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
