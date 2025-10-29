import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 🔐 Supabase login with email
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });

      if (signInError) {
        setError("Invalid email or password.");
        toast({
          title: "Login failed",
          description: signInError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Welcome back",
        description: "Successfully signed in!",
      });

      // Redirect to root - App.tsx will handle auth state
      window.location.href = "/";
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] text-white px-4">
      <div className="max-w-md w-full bg-[#111] p-8 rounded-2xl shadow-lg border border-gray-800">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Sign into your account
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <Label htmlFor="identifier">Email</Label>
            <Input
              id="identifier"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              className="bg-gray-900 text-white border-gray-700 mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-gray-900 text-white border-gray-700 mt-1"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center mt-4 text-sm text-gray-400">
          <p>
            Don’t have an account?{" "}
            <a href="/register" className="text-blue-500 hover:underline">
              Sign up
            </a>
          </p>
        </div>

        <div className="text-center mt-2 text-xs text-gray-500">
          <p>
            Option to connect your phone for SMS alerts will appear later once
            Twilio setup is complete.
          </p>
        </div>
      </div>
    </div>
  );
}
