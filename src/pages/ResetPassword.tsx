import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  // Supabase fires PASSWORD_RECOVERY when the user arrives via the reset link.
  // The client auto-exchanges the URL hash tokens before this component mounts,
  // so we just need to confirm a recovery session is present.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Sign out so the user logs in fresh with their new password
    await supabase.auth.signOut();
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-lg border border-border text-center space-y-4">
          <h1 className="text-2xl font-semibold">Password updated</h1>
          <p className="text-muted-foreground text-sm">
            Your password has been changed. Sign in with your new password.
          </p>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-lg border border-border text-center space-y-4">
          <h1 className="text-2xl font-semibold">Invalid or expired link</h1>
          <p className="text-muted-foreground text-sm">
            This password reset link is no longer valid. Request a new one.
          </p>
          <Button className="w-full" onClick={() => navigate("/forgot-password")}>
            Request new link
          </Button>
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
          <h1 className="text-2xl font-semibold text-center">Set new password</h1>
          <p className="text-muted-foreground text-sm text-center mt-1">
            Choose a strong password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="bg-secondary text-foreground border-border mt-1"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              className="bg-secondary text-foreground border-border mt-1"
              required
              disabled={isLoading}
            />
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
