import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Loader2, ArrowLeft } from "lucide-react";

export const PractitionerRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [practitionerType, setPractitionerType] = useState("physio");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: "practitioner",
            practitioner_name: name.trim(),
            practitioner_type: practitionerType,
            username: name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/practitioner`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        toast({
          title: "Account created!",
          description: "Check your email to verify your account, then sign in.",
        });
        setSuccess("Account created! Check your email to verify, then sign in.");
        setTimeout(() => navigate("/"), 3000);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Predictiv</h1>
          <p className="text-slate-500 mt-1 text-sm">Practitioner account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Create your practitioner account</h2>
          <p className="text-sm text-slate-500 mb-6">
            Monitor your patients' health data in real time.
          </p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-700">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Dr. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="border-slate-200 focus:border-blue-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="border-slate-200 focus:border-blue-400"
              />
              <p className="text-xs text-slate-400">
                Patients will use this email to grant you access.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ptype" className="text-slate-700">Role</Label>
              <Select value={practitionerType} onValueChange={setPractitionerType} disabled={isLoading}>
                <SelectTrigger id="ptype" className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physio">Physiotherapist</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="trainer">Personal Trainer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="border-slate-200 focus:border-blue-400"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-emerald-700 text-sm font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account…</>
              ) : (
                "Create Practitioner Account"
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400">or</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Sign in to existing account
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Are you a patient?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-blue-500 hover:underline"
          >
            Create a patient account instead
          </button>
        </p>
      </div>
    </div>
  );
};

export default PractitionerRegister;
