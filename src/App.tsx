import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNavigation } from "@/components/BottomNavigation";
import { RiskAlertPopup } from "@/components/alerts/RiskAlertPopup";
import { Dashboard } from "@/pages/Dashboard";
import { Training } from "@/pages/Training";
import { Health } from "@/pages/Health";
import { YourPlan } from "@/pages/YourPlan";
import { Settings } from "@/pages/Settings";
import { FindHelp } from "@/pages/FindHelp";
import { InsightsTree } from "@/pages/InsightsTree";
import { YvesChat } from "@/components/YvesChat";
import TestSupabase from "@/pages/TestSupabase";
import AuthTest from "@/pages/AuthTest";
import FitbitSyncNow from "@/pages/FitbitSyncNow";
import FitbitCallback from "@/pages/FitbitCallback";
import { OuraCallback } from "@/pages/OuraCallback";
import OuraDiagnostics from "@/pages/OuraDiagnostics";
import { OuraConnectionTest } from "@/pages/OuraConnectionTest";
import { OuraDataTest } from "@/pages/OuraDataTest";
import PolarCallback from "@/pages/auth/polar";
import MyBaselines from "@/pages/MyBaselines";
import DeveloperBaselinesEngine from "@/pages/DeveloperBaselinesEngine";
import MyDocuments from "@/pages/MyDocuments";
import { SymptomCheckIn } from "@/pages/SymptomCheckIn";
import PlanCompliance from "@/pages/PlanCompliance";
import { Planner } from "@/pages/Planner";
import { ProfileSetup } from "@/pages/ProfileSetup";
import { AdminDashboard } from "@/pages/AdminDashboard";
import PersonalCanvas from "@/pages/PersonalCanvas";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { GoogleCalendarCallback } from "@/pages/GoogleCalendarCallback";
import AlertHistory from "@/pages/AlertHistory";
import { Settings as SettingsIcon } from "lucide-react";
import { SymptomCheckInSheet } from "@/components/symptoms/SymptomCheckInSheet";
import { YvesChatSheet } from "@/components/YvesChatSheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { OfflineBanner } from "@/components/OfflineBanner";

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

  // Main tab navigation
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "planner":
        return <Planner />;
      case "training":
        return <Training />;
      case "health":
        return <Health />;
      case "your-plan":
        return <YourPlan />;
      case "plan-compliance":
        return <PlanCompliance />;
      case "my-documents":
        return <MyDocuments />;
      case "mybaselines":
        return <MyBaselines />;
      case "find-help":
        return <FindHelp />;
      case "symptom-checkin":
        return <SymptomCheckIn />;
      case "settings":
        return <Settings onNavigate={setActiveTab} />;
      case "insights-tree":
        return <InsightsTree onNavigate={setActiveTab} />;
      case "yves-insights":
        return (
          <div className="container mx-auto px-4 py-8 pb-24">
            <YvesChat />
          </div>
        );
      case "test-supabase":
        return <TestSupabase />;
      case "auth-test":
        return <AuthTest />;
      case "fitbit-sync-now":
        return <FitbitSyncNow />;
      case "oura-diagnostics":
        return <OuraDiagnostics />;
      case "developer-baselines-engine":
        return <DeveloperBaselinesEngine />;
      case "profile-setup":
        return <ProfileSetup />;
      case "admin-dashboard":
        return <AdminDashboard />;
      case "personal-canvas":
        return <PersonalCanvas />;
      default:
        return <Dashboard />;
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
            <FitbitCallback />
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
            <OuraCallback />
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
            <PolarCallback />
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
            <GoogleCalendarCallback />
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
              <AlertHistory />
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
            <OuraConnectionTest />
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
            <OuraDataTest />
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
            <AuthTest />
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
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
