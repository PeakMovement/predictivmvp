import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNavigation } from "@/components/BottomNavigation";
import { RiskAlertPopup } from "@/components/alerts/RiskAlertPopup";
import { PageLoadingFallback } from "@/components/LoadingFallback";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
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

const Dashboard = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Training = lazy(() => import("@/pages/Training").then(m => ({ default: m.Training })));
const Health = lazy(() => import("@/pages/Health").then(m => ({ default: m.Health })));
const YourPlan = lazy(() => import("@/pages/YourPlan").then(m => ({ default: m.YourPlan })));
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })));
const FindHelp = lazy(() => import("@/pages/FindHelp").then(m => ({ default: m.FindHelp })));
const InsightsTree = lazy(() => import("@/pages/InsightsTree").then(m => ({ default: m.InsightsTree })));
const YvesChat = lazy(() => import("@/components/YvesChat").then(m => ({ default: m.YvesChat })));
const TestSupabase = lazy(() => import("@/pages/TestSupabase"));
const AuthTest = lazy(() => import("@/pages/AuthTest"));
const FitbitSyncNow = lazy(() => import("@/pages/FitbitSyncNow"));
const FitbitCallback = lazy(() => import("@/pages/FitbitCallback"));
const OuraCallback = lazy(() => import("@/pages/OuraCallback").then(m => ({ default: m.OuraCallback })));
const OuraDiagnostics = lazy(() => import("@/pages/OuraDiagnostics"));
const OuraConnectionTest = lazy(() => import("@/pages/OuraConnectionTest").then(m => ({ default: m.OuraConnectionTest })));
const OuraDataTest = lazy(() => import("@/pages/OuraDataTest").then(m => ({ default: m.OuraDataTest })));
const PolarCallback = lazy(() => import("@/pages/auth/polar"));
const MyBaselines = lazy(() => import("@/pages/MyBaselines"));
const DeveloperBaselinesEngine = lazy(() => import("@/pages/DeveloperBaselinesEngine"));
const MyDocuments = lazy(() => import("@/pages/MyDocuments"));
const SymptomCheckIn = lazy(() => import("@/pages/SymptomCheckIn").then(m => ({ default: m.SymptomCheckIn })));
const PlanCompliance = lazy(() => import("@/pages/PlanCompliance"));
const Planner = lazy(() => import("@/pages/Planner").then(m => ({ default: m.Planner })));
const ProfileSetup = lazy(() => import("@/pages/ProfileSetup").then(m => ({ default: m.ProfileSetup })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const PersonalCanvas = lazy(() => import("@/pages/PersonalCanvas"));
const GoogleCalendarCallback = lazy(() => import("@/pages/GoogleCalendarCallback").then(m => ({ default: m.GoogleCalendarCallback })));
const AlertHistory = lazy(() => import("@/pages/AlertHistory"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable stale time to ensure fresh data on user switch
      staleTime: 0,
    },
  },
});

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  const sessionTimeout = useSessionTimeout({
    onWarning: () => {
      console.log('[App] Session expiring soon');
    },
    onTimeout: () => {
      console.log('[App] Session expired - logging out');
      window.location.href = '/';
    },
  });

  const currentPath = window.location.pathname;
  const isDashboardRoute = currentPath === "/dashboard";
  const isFitbitCallback = currentPath === "/fitbit/callback";
  const isOuraCallback = currentPath.startsWith("/oauth/callback/oura");
  const isPolarCallback = currentPath === "/auth/polar";
  const isGoogleCalendarCallback = currentPath === "/google-calendar-callback";
  const isOuraTest = currentPath === "/oura-test";
  const isOuraDataTest = currentPath === "/oura-data-test";
  const isAuthTest = currentPath === "/auth-test";
  const isAlertHistory = currentPath === "/alert-history";

  // Check authentication status and clear state on logout
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      
      // CRITICAL: Clear all cached data on sign out to prevent cross-user leakage
      if (event === 'SIGNED_OUT') {
        console.log('[App] User signed out - clearing all cached state');
        
        // Clear React Query cache completely
        queryClient.clear();
        
        // Clear user-specific localStorage keys
        const userSpecificKeys = [
          'todays-decision-cache',
          'insightHistory',
          'wearable_connected',
          'wearable_last_sync',
          'layout_customization',
          'alert-settings',
        ];
        userSpecificKeys.forEach(key => localStorage.removeItem(key));
        
        // Clear user-specific sessionStorage keys
        const sessionKeys = [
          'activeClientProfile',
          'clientProfiles',
          'findHelpQuery',
          'wearable_code_verifier',
          'wearable_user_id',
        ];
        sessionKeys.forEach(key => sessionStorage.removeItem(key));
        
        // Reset active tab to dashboard
        setActiveTab('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check onboarding status for authenticated users
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated) {
        setNeedsOnboarding(null);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("user_profiles")
          .select("onboarding_completed, onboarding_skipped")
          .eq("user_id", user.id)
          .maybeSingle();

        const shouldShowOnboarding = !data?.onboarding_completed && !data?.onboarding_skipped;
        setNeedsOnboarding(shouldShowOnboarding);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setNeedsOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated]);

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setNeedsOnboarding(false);
  };

  useEffect(() => {
    const handleNavigateInsights = () => setActiveTab("insights-tree");
    const handleNavigateYves = () => setActiveTab("yves-insights");
    const handleNavigateTab = (e: CustomEvent) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };

    window.addEventListener("navigate-insights", handleNavigateInsights as EventListener);
    window.addEventListener("navigate-yves-insights", handleNavigateYves as EventListener);
    window.addEventListener("navigate-tab", handleNavigateTab as EventListener);

    return () => {
      window.removeEventListener("navigate-insights", handleNavigateInsights as EventListener);
      window.removeEventListener("navigate-yves-insights", handleNavigateYves as EventListener);
      window.removeEventListener("navigate-tab", handleNavigateTab as EventListener);
    };
  }, []);

  // Sync tab when navigating directly to /dashboard
  useEffect(() => {
    if (isDashboardRoute && activeTab !== "dashboard") {
      setActiveTab("dashboard");
    }
  }, [isDashboardRoute, activeTab]);

  // Main tab navigation with Suspense boundaries for lazy-loaded components
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Dashboard />
          </Suspense>
        );
      case "planner":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Planner />
          </Suspense>
        );
      case "training":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Training />
          </Suspense>
        );
      case "health":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Health />
          </Suspense>
        );
      case "your-plan":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <YourPlan />
          </Suspense>
        );
      case "plan-compliance":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <PlanCompliance />
          </Suspense>
        );
      case "my-documents":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <MyDocuments />
          </Suspense>
        );
      case "mybaselines":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <MyBaselines />
          </Suspense>
        );
      case "find-help":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <FindHelp />
          </Suspense>
        );
      case "symptom-checkin":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <SymptomCheckIn />
          </Suspense>
        );
      case "settings":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Settings onNavigate={setActiveTab} />
          </Suspense>
        );
      case "insights-tree":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <InsightsTree onNavigate={setActiveTab} />
          </Suspense>
        );
      case "yves-insights":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <div className="container mx-auto px-4 py-8 pb-24">
              <YvesChat />
            </div>
          </Suspense>
        );
      case "test-supabase":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <TestSupabase />
          </Suspense>
        );
      case "auth-test":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <AuthTest />
          </Suspense>
        );
      case "fitbit-sync-now":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <FitbitSyncNow />
          </Suspense>
        );
      case "oura-diagnostics":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <OuraDiagnostics />
          </Suspense>
        );
      case "developer-baselines-engine":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <DeveloperBaselinesEngine />
          </Suspense>
        );
      case "profile-setup":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProfileSetup />
          </Suspense>
        );
      case "admin-dashboard":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminDashboard />
          </Suspense>
        );
      case "personal-canvas":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <PersonalCanvas />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Dashboard />
          </Suspense>
        );
    }
  };

  // Handle Fitbit callback route (requires auth but separate flow)
  if (isFitbitCallback) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoadingFallback />}>
              <FitbitCallback />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Handle Ōura callback route
  if (isOuraCallback) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoadingFallback />}>
              <OuraCallback />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Handle Polar callback route
  if (isPolarCallback) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoadingFallback />}>
              <PolarCallback />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Handle Google Calendar callback route
  if (isGoogleCalendarCallback) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoadingFallback />}>
              <GoogleCalendarCallback />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Handle Alert History route
  if (isAlertHistory) {
    if (isAuthenticated === false) {
      window.location.href = "/";
      return null;
    }

    if (isAuthenticated === null) {
      return (
        <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      );
    }

    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <Toaster />
              <Sonner />
              <OfflineBanner />
              <ThemeToggle />
              <Suspense fallback={<PageLoadingFallback />}>
                <AlertHistory />
              </Suspense>
              <BottomNavigation activeTab="settings" onTabChange={(tab) => {
                if (tab !== "settings") {
                  window.location.href = "/";
                }
              }} />
            </div>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Handle Ōura connection test route
  if (isOuraTest) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoadingFallback />}>
              <OuraConnectionTest />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Handle Oura Data Test route
  if (isOuraDataTest) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoadingFallback />}>
              <OuraDataTest />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Handle Auth Test route (accessible without auth for testing)
  if (isAuthTest) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoadingFallback />}>
              <AuthTest />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-glow-pulse text-primary text-xl">Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    const currentPath = window.location.pathname;
    const isRegisterRoute = currentPath === "/register";

    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {isRegisterRoute ? (
              <Register />
        ) : (
          <Login />
        )}
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Show onboarding for new users
  if (needsOnboarding === true) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OnboardingFlow
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingSkip}
            />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Show loading while checking onboarding status
  if (needsOnboarding === null) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-glow-pulse text-primary text-xl">Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineBanner />
          <SessionTimeoutWarning
            open={sessionTimeout.showWarning}
            timeRemaining={sessionTimeout.timeRemaining}
            onExtendSession={sessionTimeout.extendSession}
            onLogout={sessionTimeout.logout}
            onDismiss={sessionTimeout.dismissWarning}
          />
          <AccessibilityWrapper>
            <div className="relative overflow-hidden min-h-screen">
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab("settings")}
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
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
              <SymptomCheckInSheet />
              <YvesChatSheet />
              <div className="transition-all duration-500 ease-out animate-fade-in">{renderContent()}</div>
              <BottomNavigation activeTab={activeTab} onNavigate={setActiveTab} />
              {/* Risk Alert Modal - auto-triggers on health thresholds */}
              <RiskAlertPopup onNavigateToHelp={() => setActiveTab("find-help")} />
            </div>
          </AccessibilityWrapper>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
