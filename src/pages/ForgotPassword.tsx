import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-lg border border-border text-center space-y-4">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            We sent a password reset link to <strong>{email}</strong>. Check your
            inbox and click the link to set a new password.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder, or{" "}
            <button
              onClick={() => setSubmitted(false)}
              className="text-primary hover:underline"
            >
              try again
            </button>
            .
          </p>
          <Button variant="ghost" className="w-full" onClick={() => navigate("/login")}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-lg border border-border">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-center">Reset your password</h1>
          <p className="text-muted-foreground text-sm text-center mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-secondary text-foreground border-border mt-1"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <div className="text-center mt-4 text-sm text-muted-foreground">
          <button onClick={() => navigate("/login")} className="text-primary hover:underline">
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
