import { OuraDataDiagnostics } from "@/components/OuraDataDiagnostics";

export const OuraDataTest = () => {
  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Oura Data Diagnostics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive testing tool to verify your Oura Ring integration
          </p>
        </div>

        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">How to Use This Tool</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Click "Run Diagnostics" to test all components of your Oura integration</li>
            <li>The tool will check: Authentication, OAuth tokens, Database data, and Sync logs</li>
            <li>Review each section for status indicators:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li className="text-green-500">✅ Green = Success</li>
                <li className="text-yellow-500">⚠️ Yellow = Warning (needs attention)</li>
                <li className="text-red-500">❌ Red = Error (action required)</li>
              </ul>
            </li>
            <li>Follow the "Next Steps" guidance at the bottom to fix any issues</li>
          </ol>
        </div>

        <OuraDataDiagnostics />

        <div className="mt-8 bg-glass/50 backdrop-blur-xl border border-glass-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3">Common Issues & Solutions</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-foreground mb-1">
                ❌ "No Oura token found"
              </h4>
              <p className="text-muted-foreground">
                <strong>Solution:</strong> Go to Settings → Connected Devices → Click "Connect Oura Ring".
                Complete the OAuth flow to authorize the app.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">
                ⚠️ "Token expired"
              </h4>
              <p className="text-muted-foreground">
                <strong>Solution:</strong> Disconnect and reconnect your Oura Ring in Settings.
                Tokens expire after a certain period for security.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">
                ⚠️ "No Oura data found in database"
              </h4>
              <p className="text-muted-foreground">
                <strong>Solution:</strong> Click "Update Now" button to trigger a sync. If this is
                your first time connecting, wait until tomorrow morning for sleep data to appear.
                Activity data should sync within minutes.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">
                ⚠️ "No new data" message from Oura
              </h4>
              <p className="text-muted-foreground">
                <strong>Explanation:</strong> This means Oura's servers don't have new data to provide.
                Oura processes data in the morning (~8 AM local time). Make sure your ring has synced
                to the Oura mobile app recently (ring syncs every ~2 hours when in Bluetooth range).
              </p>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">
                🕐 When does Oura data become available?
              </h4>
              <p className="text-muted-foreground">
                <strong>Sleep & Readiness:</strong> Available next morning after wearing ring overnight (~6-10 AM)<br />
                <strong>Activity:</strong> Updates throughout the day, finalized at midnight<br />
                <strong>Steps & HR:</strong> Real-time in Oura app, but API returns daily summaries only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
