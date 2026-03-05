import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNavigation } from "@/components/BottomNavigation";
import { RiskAlertPopup } from "@/components/alerts/RiskAlertPopup";
import { PageLoadingFallback } from "@/components/LoadingFallback";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import { Settings as SettingsIcon } from "lucide-react";
import { SymptomCheckInSheet } from "@/components/symptoms/SymptomCheckInSheet";
import { YvesChatSheet } from "@/components/YvesChatSheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AccessibilityWrapper } from "@/components/AccessibilityWrapper";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

const Dashboard          = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Training           = lazy(() => import("@/pages/Training").then(m => ({ default: m.Training })));
const Health             = lazy(() => import("@/pages/Health").then(m => ({ default: m.Health })));
const YourPlan           = lazy(() => import("@/pages/YourPlan").then(m => ({ default: m.YourPlan })));
const Settings           = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })));
const FindHelp           = lazy(() => import("@/pages/FindHelp").then(m => ({ default: m.FindHelp })));
const InsightsTree       = lazy(() => import("@/pages/InsightsTree").then(m => ({ default: m.InsightsTree })));
const YvesChat           = lazy(() => import("@/components/YvesChat").then(m => ({ default: m.YvesChat })));
const OuraCallback       = lazy(() => import("@/pages/OuraCallback").then(m => ({ default: m.OuraCallback })));
const PolarCallback      = lazy(() => import("@/pages/auth/polar"));
const MyBaselines        = lazy(() => import("@/pages/MyBaselines"));
const MyDocuments        = lazy(() => import("@/pages/MyDocuments"));
const SymptomCheckIn     = lazy(() => import("@/pages/SymptomCheckIn").then(m => ({ default: m.SymptomCheckIn })));
const PlanCompliance     = lazy(() => import("@/pages/PlanCompliance"));
const Planner            = lazy(() => import("@/pages/Planner").then(m => ({ default: m.Planner })));
const ProfileSetup       = lazy(() => import("@/pages/ProfileSetup").then(m => ({ default: m.ProfileSetup })));
const AdminDashboard     = lazy(() => import("@/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const PersonalCanvas     = lazy(() => import("@/pages/PersonalCanvas"));
const GoogleCalendarCallback = lazy(() => import("@/pages/GoogleCalendarCallback").then(m => ({ default: m.GoogleCalendarCallback })));
const AlertHistory       = lazy(() => import("@/pages/AlertHistory"));
const MetricsDashboard   = lazy(() => import("@/pages/MetricsDashboard"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0 } },
});

const TAB_PATHS: Record<string, string> = {
  "dashboard":          "/dashboard",
  "planner":            "/planner",
  "training":           "/training",
  "health":             "/health",
  "your-plan":          "/your-plan",
  "plan-compliance":    "/plan-compliance",
  "my-documents":       "/my-documents",
  "mybaselines":        "/my-baselines",
  "find-help":          "/find-help",
  "symptom-checkin":    "/symptom-checkin",
  "settings":           "/settings",
  "insights-tree":      "/insights-tree",
  "yves-insights":      "/yves-insights",
  "profile-setup":      "/profile-setup",
  "admin-dashboard":    "/admin-dashboard",
  "personal-canvas":    "/personal-canvas",
  "metrics-dashboard":  "/metrics-dashboard",
  "alert-history":      "/alert-history",
};

const PATH_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab])
);

const AuthenticatedApp = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const activeTab = PATH_TO_TAB[location.pathname] ?? "dashboard";

  const sessionTimeout = useSessionTimeout({
    onWarning: () => console.log("[App] Session expiring soon"),
    onTimeout: () => {
      console.log("[App] Session expired - logging out");
      navigate("/");
    },
  });

  const handleNavigate = (tab: string) => {
    const path = TAB_PATHS[tab];
    if (path) navigate(path);
  };

  useEffect(() => {
    const onInsights = () => handleNavigate("insights-tree");
    const onYves     = () => handleNavigate("yves-insights");
    const onTab      = (e: CustomEvent) => { if (e.detail) handleNavigate(e.detail); };

    window.addEventListener("navigate-insights",      onInsights as EventListener);
    window.addEventListener("navigate-yves-insights", onYves     as EventListener);
    window.addEventListener("navigate-tab",           onTab      as EventListener);

    return () => {
      window.removeEventListener("navigate-insights",      onInsights as EventListener);
      window.removeEventListener("navigate-yves-insights", onYves     as EventListener);
      window.removeEventListener("navigate-tab",           onTab      as EventListener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AccessibilityWrapper>
      <OfflineBanner />
      <SessionTimeoutWarning
        open={sessionTimeout.showWarning}
        timeRemaining={sessionTimeout.timeRemaining}
        onExtendSession={sessionTimeout.extendSession}
        onLogout={sessionTimeout.logout}
        onDismiss={sessionTimeout.dismissWarning}
      />
      <div className="relative overflow-hidden min-h-screen">
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleNavigate("settings")}
              className={cn(
                "fixed top-[80px] right-6 z-50",
                "w-12 h-12 rounded-xl bg-glass backdrop-blur-xl border-glass-border",
                "flex items-center justify-center",
                "hover:bg-glass-highlight hover:scale-110 active:scale-95",
                "transition-all duration-300 ease-out transform-gpu animate-fade-in",
              )}
              aria-label="Settings"
            >
              <SettingsIcon size={20} className="text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Settings</p></TooltipContent>
        </Tooltip>

        <SymptomCheckInSheet />
        <YvesChatSheet />

        <div className="transition-all duration-500 ease-out animate-fade-in">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/"                   element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"          element={<Dashboard />} />
              <Route path="/planner"            element={<Planner />} />
              <Route path="/training"           element={<Training />} />
              <Route path="/health"             element={<Health />} />
              <Route path="/your-plan"          element={<YourPlan />} />
              <Route path="/plan-compliance"    element={<PlanCompliance />} />
              <Route path="/my-documents"       element={<MyDocuments />} />
              <Route path="/my-baselines"       element={<MyBaselines />} />
              <Route path="/find-help"          element={<FindHelp />} />
              <Route path="/symptom-checkin"    element={<SymptomCheckIn />} />
              <Route path="/settings"           element={<Settings onNavigate={handleNavigate} />} />
              <Route path="/insights-tree"      element={<InsightsTree onNavigate={handleNavigate} />} />
              <Route path="/yves-insights"      element={<div className="container mx-auto px-4 py-8 pb-24"><YvesChat /></div>} />
              <Route path="/profile-setup"      element={<ProfileSetup />} />
              <Route path="/admin-dashboard"    element={<AdminDashboard />} />
              <Route path="/personal-canvas"    element={<PersonalCanvas />} />
              <Route path="/metrics-dashboard"  element={<MetricsDashboard />} />
              <Route path="/alert-history"      element={<AlertHistory />} />
              <Route path="*"                   element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>

        <BottomNavigation activeTab={activeTab} onNavigate={handleNavigate} />
        <RiskAlertPopup onNavigateToHelp={() => handleNavigate("find-help")} />
      </div>
    </AccessibilityWrapper>
  );
};

const AppInner = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const location = useLocation();

  const OAUTH_PATHS = [
    "/oauth/callback/oura",
    "/auth/polar",
    "/google-calendar-callback",
    "/reset-password",
  ];
  const isOAuthRoute = OAUTH_PATHS.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        const lsKeys = [
          "todays-decision-cache", "insightHistory", "wearable_connected",
          "wearable_last_sync", "layout_customization", "alert-settings",
        ];
        lsKeys.forEach(k => localStorage.removeItem(k));
        const ssKeys = [
          "activeClientProfile", "clientProfiles", "findHelpQuery",
          "wearable_code_verifier", "wearable_user_id",
        ];
        ssKeys.forEach(k => sessionStorage.removeItem(k));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { setNeedsOnboarding(null); return; }
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("user_profiles")
          .select("onboarding_completed, onboarding_skipped")
          .eq("user_id", user.id)
          .maybeSingle();
        setNeedsOnboarding(!data?.onboarding_completed && !data?.onboarding_skipped);
      } catch {
        setNeedsOnboarding(false);
      }
    })();
  }, [isAuthenticated]);

  if (isOAuthRoute) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/oauth/callback/oura"      element={<OuraCallback />} />
          <Route path="/auth/polar"               element={<PolarCallback />} />
          <Route path="/google-calendar-callback" element={<GoogleCalendarCallback />} />
          <Route path="/reset-password"           element={<ResetPassword />} />
        </Routes>
      </Suspense>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-glow-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*"                element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  if (needsOnboarding === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-glow-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (needsOnboarding === true) {
    return (
      <OnboardingFlow
        onComplete={() => setNeedsOnboarding(false)}
        onSkip={() => setNeedsOnboarding(false)}
      />
    );
  }

  return <AuthenticatedApp />;
};

const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppInner />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
