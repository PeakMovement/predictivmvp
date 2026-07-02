import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Loader as Loader2 } from "lucide-react";

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
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-signup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              user_id: data.user.id,
              email,
              username,
              account_type: "user",
            }),
          });
        } catch (webhookErr) {
          console.error("notify-signup webhook failed:", webhookErr);
        }

        if (data.session) {
          try {
            await supabase
              .from("user_profiles")
              .upsert({ user_id: data.user.id, full_name: username }, { onConflict: "user_id" });
          } catch (_) {}
          navigate("/");
          return;
        }

        setError("");
        toast({
          title: "Check your email",
          description: "We've sent you a verification link. Click it to get started.",
        });
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* ── Ambient radial ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-coldBlue/[0.03] blur-[100px]" />
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-5xl mx-auto">
        <span className="font-mono text-[12px] tracking-[0.05em] uppercase text-coldBlue/60">
          Predictiv.
        </span>
        <button
          onClick={() => navigate("/login")}
          className="font-mono text-[12px] tracking-[0.04em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign In
        </button>
      </nav>

      {view === "hero" ? (
        <main className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-24 max-w-3xl mx-auto animate-fade-in">
          {/* ── Eyebrow ──────────────────────────────────────────── */}
          <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/50 mb-10">
            AI-Powered Health Intelligence
          </p>

          {/* ── Headline ─────────────────────────────────────────── */}
          <h1 className="font-display font-light text-5xl sm:text-6xl md:text-7xl leading-[1.05] tracking-tight text-foreground mb-4">
            Predictiv.
          </h1>
          <h2 className="font-display font-light italic text-2xl sm:text-3xl md:text-4xl leading-tight text-gold/80 mb-10">
            The Future Of Health Today.
          </h2>

          {/* ── Subheadline ──────────────────────────────────────── */}
          <p className="font-sans text-base text-muted-foreground/70 max-w-lg mb-12 leading-relaxed tracking-wide">
            Connect your wearable. Answer 7 questions.
            Get an AI coach that knows your body, your sport, and your goals.
          </p>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <button
            onClick={() => setView("signup")}
            className="group bg-marble3 text-background font-sans font-semibold text-xs tracking-[0.04em] uppercase px-10 py-4 hover:opacity-90 active:scale-[0.97] active:opacity-85 transition-all duration-100"
          >
            Begin
            <ArrowRight className="inline-block h-3.5 w-3.5 ml-3 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <p className="font-mono text-[11px] tracking-[0.04em] uppercase text-muted-foreground/60 mt-6">
            Free to start
          </p>

          {/* ── Feature cards ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-24 w-full bg-line">
            <FeatureCard
              eyebrow="01"
              title="Wearable Intelligence"
              description="Oura, Garmin, or Polar decoded into actionable formulas."
            />
            <FeatureCard
              eyebrow="02"
              title="AI Coach (Yves)"
              description="Daily briefings and personalised risk alerts. Not generic advice."
            />
            <FeatureCard
              eyebrow="03"
              title="Injury Prevention"
              description="ACWR monitoring, load tracking, and recovery scoring."
            />
          </div>

          {/* ── How it works ─────────────────────────────────────── */}
          <div className="mt-24 w-full">
            <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40 mb-10">
              How It Works
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <Step number="01" title="Sign Up" description="30 seconds to create your account" />
              <Step number="02" title="7 Questions" description="Training, goals, and lifestyle" />
              <Step number="03" title="Connect Device" description="Link Oura, Garmin, or Polar" />
              <Step number="04" title="First Briefing" description="Yves analyses and begins" />
            </div>
          </div>

          {/* ── Bottom CTA ───────────────────────────────────────── */}
          <div className="mt-24">
            <button
              onClick={() => setView("signup")}
              className="border border-marble1/20 text-foreground font-sans font-semibold text-xs tracking-[0.04em] uppercase px-10 py-4 hover:border-marble1/40 active:scale-[0.97] active:opacity-85 transition-all duration-100"
            >
              Start Your Journey
            </button>
          </div>

          {/* ── Footer ───────────────────────────────────────────── */}
          <footer className="mt-20 pt-8 border-t border-border w-full text-center">
            <p className="font-mono text-[11px] tracking-[0.04em] uppercase text-muted-foreground/60">
              <a href="/terms" className="hover:text-muted-foreground">Terms</a>
              <span className="mx-3">&middot;</span>
              <a href="/privacy" className="hover:text-muted-foreground">Privacy</a>
              <span className="mx-3">&middot;</span>
              &copy; {new Date().getFullYear()} Predictiv.
            </p>
          </footer>
        </main>
      ) : (
        /* ── Signup Form ───────────────────────────────────────────── */
        <main className="relative z-10 flex flex-col items-center px-6 pt-16 pb-24 max-w-sm mx-auto animate-fade-in">
          <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/50 mb-6">
            Create Account
          </p>
          <h2 className="font-display font-light text-3xl text-foreground mb-2">Begin here.</h2>
          <p className="font-sans text-sm text-muted-foreground mb-10">
            Then 7 quick questions to set up your profile.
          </p>

          <form onSubmit={handleSignup} className="w-full space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="username" className="font-mono text-[11px] tracking-[0.05em] uppercase text-muted-foreground">
                Name
              </label>
              <Input
                id="username"
                placeholder="Your first name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="font-mono text-[11px] tracking-[0.05em] uppercase text-muted-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="font-mono text-[11px] tracking-[0.05em] uppercase text-muted-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 font-sans"
              />
            </div>

            {error && (
              <p className="font-mono text-[12px] tracking-wider text-critical text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-marble3 text-background font-sans font-semibold text-xs tracking-[0.04em] uppercase py-4 hover:opacity-90 active:scale-[0.97] active:opacity-85 transition-all duration-100 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Initialising...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          </form>

          <p className="font-mono text-[11px] tracking-[0.03em] text-muted-foreground/50 mt-8 text-center leading-relaxed">
            By signing up you agree to our{" "}
            <a href="/terms" className="underline hover:text-muted-foreground">Terms</a>
            {" and "}
            <a href="/privacy" className="underline hover:text-muted-foreground">Privacy Policy</a>.
          </p>

          <button
            onClick={() => setView("hero")}
            className="mt-8 font-mono text-[12px] tracking-[0.04em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back
          </button>

          <p className="mt-4 font-sans text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-coldBlue hover:text-ice transition-colors">
              Sign in
            </button>
          </p>
        </main>
      )}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function FeatureCard({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="bg-card p-6 text-left">
      <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40 mb-4">{eyebrow}</p>
      <h3 className="font-sans font-semibold text-sm text-foreground tracking-wide mb-2">{title}</h3>
      <p className="font-sans text-xs text-muted-foreground leading-relaxed tracking-wide">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-[12px] tracking-[0.04em] text-coldBlue/50 mb-3">{number}</p>
      <h3 className="font-sans font-semibold text-sm text-foreground tracking-wide mb-1">{title}</h3>
      <p className="font-sans text-xs text-muted-foreground tracking-wide">{description}</p>
    </div>
  );
}
