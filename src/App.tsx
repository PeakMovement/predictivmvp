import { ThemeProvider } from "@/components/ThemeProvider";
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { Layout } from "./routes/layout";
import { ProtectedRoute } from "./routes/protected-routes";
import { AppRoutes } from "./routes/routes";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="predictiv-theme">
      <QueryClientProvider client={queryClient}>
        <LiveDataProvider>
          <BrowserRouter>
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout>
                <AppRoutes />
              </Layout>
            </ProtectedRoute>
          </BrowserRouter>
        </LiveDataProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
