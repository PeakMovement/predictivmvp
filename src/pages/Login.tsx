import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });

      if (signInError) {
        setError("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      toast({
        title: "Welcome back",
        description: "Successfully signed in.",
      });

      window.location.href = "/";
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-coldBlue/[0.02] blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-coldBlue/50 mb-4">Predictiv.</p>
          <h1 className="font-display font-light text-3xl text-foreground">Sign In</h1>
        </div>

        <div className="border border-border bg-card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
                Email
              </label>
              <Input
                id="identifier"
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground/40 font-sans"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="font-mono text-[8px] tracking-[0.15em] text-coldBlue/40 hover:text-coldBlue transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground/40 font-sans"
                required
              />
            </div>

            {error && (
              <p className="font-mono text-[10px] tracking-wider text-critical text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-marble3 text-background font-sans font-semibold text-xs tracking-[0.25em] uppercase py-4 mt-2 hover:opacity-90 active:scale-[0.97] active:opacity-85 transition-all duration-100 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="font-sans text-sm text-muted-foreground">
              No account?{" "}
              <a href="/genesis" className="text-coldBlue hover:text-ice transition-colors">
                Sign up
              </a>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="font-mono text-[8px] tracking-[0.15em] uppercase text-muted-foreground/40">
              <a href="/terms" className="hover:text-muted-foreground">Terms</a>
              <span className="mx-2">&middot;</span>
              <a href="/privacy" className="hover:text-muted-foreground">Privacy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
