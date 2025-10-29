import { Dashboard } from "@/pages/Dashboard";
import DeveloperBaselinesEngine from "@/pages/DeveloperBaselinesEngine";
import { FindHelp } from "@/pages/FindHelp";
import FitbitCallback from "@/pages/FitbitCallback";
import FitbitSyncNow from "@/pages/FitbitSyncNow";
import { Health } from "@/pages/Health";
import { InsightsTree } from "@/pages/InsightsTree";
import Login from "@/pages/Login";
import MyBaselines from "@/pages/MyBaselines";
import MyDocuments from "@/pages/MyDocuments";
import PlanCompliance from "@/pages/PlanCompliance";
import { ProfileSetup } from "@/pages/ProfileSetup";
import Register from "@/pages/Register";
import { Settings } from "@/pages/Settings";
import TestSupabase from "@/pages/TestSupabase";
import { Training } from "@/pages/Training";
import { YourPlan } from "@/pages/YourPlan";
import { Navigate, Route, Routes } from "react-router-dom";

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/fitbit/callback" element={<FitbitCallback />} />

      {/* Protected routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/training" element={<Training />} />
      <Route path="/health" element={<Health />} />
      <Route path="/your-plan" element={<YourPlan />} />
      <Route path="/plan-compliance" element={<PlanCompliance />} />
      <Route path="/my-documents" element={<MyDocuments />} />
      <Route path="/mybaselines" element={<MyBaselines />} />
      <Route path="/find-help" element={<FindHelp />} />
      <Route path="/settings" element={<Settings />} />
      <Route
        path="/insights-tree"
        element={
          <InsightsTree
            onNavigate={function (tab: string): void {
              throw new Error("Function not implemented.");
            }}
          />
        }
      />
      <Route path="/test-supabase" element={<TestSupabase />} />
      <Route path="/fitbit-sync-now" element={<FitbitSyncNow />} />
      <Route
        path="/developer-baselines-engine"
        element={<DeveloperBaselinesEngine />}
      />
      <Route path="/profile-setup" element={<ProfileSetup />} />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
