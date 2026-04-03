import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Brain,
  Shield,
  ChevronRight,
  ArrowRight,
  Loader2,
} from "lucide-react";

type View = "hero" | "signup";

export default function Genesis() {
  const [view, setView] = useState<View>("hero");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!username || !email || !password) {
      setError("All fields are required");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        if (data.session) {
          // Auto-confirmed — seed profile and go to onboarding
          try {
            await supabase
              .from("user_profiles")
              .upsert({ user_id: data.user.id, full_name: username }, { onConflict: "user_id" });
          } catch (_) {}
          navigate("/");
          return;
        }

        // Email confirmation required
        toast({
          title: "Check your email",
          description: "We've sent you a verification link. Click it to get started.",
        });
        setError("");
        setView("hero");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* ── Ambient glow ──────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="text-lg font-bold tracking-tight text-foreground">
          PREDICTIV
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/login")}
          className="text-muted-foreground hover:text-foreground"
        >
          Sign In
        </Button>
      </nav>

      {view === "hero" ? (
        /* ── Hero Section ──────────────────────────────────────────── */
        <main className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-24 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary mb-8">
            <Activity className="h-3 w-3" />
            AI-Powered Health Intelligence
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
            <span className="text-foreground">Predictiv.</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              The Future Of Health Today.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
            Connect your wearable. Answer 7 questions.
            Get an AI health coach that knows your body, your sport, and your goals.
          </p>

          {/* CTA */}
          <Button
            size="lg"
            onClick={() => setView("signup")}
            className="text-base px-8 py-6 rounded-xl gap-2 shadow-[0_0_24px_rgba(139,92,246,0.2)] hover:shadow-[0_0_32px_rgba(139,92,246,0.3)] transition-all"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="text-xs text-muted-foreground/60 mt-4">
            Free to start. No credit card required.
          </p>

          {/* ── Feature cards ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 w-full">
            <FeatureCard
              icon={<Activity className="h-5 w-5" />}
              title="Wearable Intelligence"
              description="Oura, Garmin, or Polar — we decode your biometrics into actionable formulas."
            />
            <FeatureCard
              icon={<Brain className="h-5 w-5" />}
              title="AI Coach (Yves)"
              description="Daily briefings, risk alerts, and personalised recommendations — not generic advice."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Injury Prevention"
              description="ACWR monitoring, load tracking, and recovery scoring to keep you training safely."
            />
          </div>

          {/* ── How it works ──────────────────────────────────────── */}
          <div className="mt-24 w-full">
            <h2 className="text-2xl font-bold mb-10">How it works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <Step number="1" title="Sign Up" description="Create your account in 30 seconds" />
              <Step number="2" title="Answer 7 Questions" description="Tell us about your training, goals, and lifestyle" />
              <Step number="3" title="Connect Your Device" description="Link Oura, Garmin, or Polar" />
              <Step number="4" title="Get Your First Briefing" description="Yves analyses your data and starts coaching" />
            </div>
          </div>

          {/* ── Bottom CTA ────────────────────────────────────────── */}
          <div className="mt-24">
            <Button
              size="lg"
              onClick={() => setView("signup")}
              className="text-base px-8 py-6 rounded-xl gap-2"
            >
              Start Your Journey
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <footer className="mt-20 pt-8 border-t border-border/30 w-full text-center">
            <p className="text-xs text-muted-foreground/50">
              <a href="/terms" className="hover:underline">Terms</a>
              {" · "}
              <a href="/privacy" className="hover:underline">Privacy</a>
              {" · "}
              &copy; {new Date().getFullYear()} Predictiv
            </p>
          </footer>
        </main>
      ) : (
        /* ── Signup Form ───────────────────────────────────────────── */
        <main className="relative z-10 flex flex-col items-center px-6 pt-12 pb-24 max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Then we'll ask you 7 quick questions to set up your profile
          </p>

          <form onSubmit={handleSignup} className="w-full space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Name</Label>
              <Input
                id="username"
                placeholder="Your first name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-card border-border"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full py-5 text-base" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...</>
              ) : (
                <>Create Account <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            By signing up you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms</a>
            {" and "}
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>

          <button
            onClick={() => setView("hero")}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back
          </button>

          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </main>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card/30 border border-border/40 rounded-xl p-5 text-left hover:bg-card/50 transition-colors">
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
        <span className="text-sm font-bold text-primary">{number}</span>
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
