// @ts-nocheck — practitioners table not yet in generated types
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Loader2, ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRACTITIONER_TYPES = [
  { value: "physiotherapist",      label: "Physiotherapist" },
  { value: "biokineticist",        label: "Biokineticist" },
  { value: "sports_doctor",        label: "Sports Doctor" },
  { value: "run_coach",            label: "Run Coach" },
  { value: "strength_coach",       label: "Strength & Conditioning Coach" },
  { value: "general_practitioner", label: "General Practitioner" },
  { value: "dietician",            label: "Dietician" },
  { value: "other",                label: "Other" },
];

const SPECIALISATIONS = [
  "Post-surgical rehab",
  "Running injuries",
  "Chronic pain",
  "Performance optimisation",
  "Return to sport",
  "Strength & conditioning",
  "Youth athletes",
  "Endurance sports",
  "Back & spine",
  "Shoulder & rotator cuff",
  "Knee & ACL",
  "Nutrition & weight management",
];

// ─── Component ────────────────────────────────────────────────────────────────

export const PractitionerRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1 — account
  const [step, setStep] = useState<1 | 2 | "done">(1);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [type, setType]         = useState("physiotherapist");

  // Step 2 — profile
  const [locationCity,    setLocationCity]    = useState("");
  const [locationSuburb,  setLocationSuburb]  = useState("");
  const [bio,             setBio]             = useState("");
  const [specs,           setSpecs]           = useState<string[]>([]);
  const [fee,             setFee]             = useState("");
  const [acceptsMedAid,   setAcceptsMedAid]   = useState(false);
  const [telehealth,      setTelehealth]      = useState(false);
  const [phone,           setPhone]           = useState("");
  const [contactEmail,    setContactEmail]    = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");
  const [userId, setUserId]       = useState<string | null>(null);

  // ── Step 1: create auth account ────────────────────────────────────────────

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) { setError("All fields are required."); return; }
    if (password.length < 8)          { setError("Password must be at least 8 characters."); return; }

    setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: "practitioner",
            practitioner_name: name.trim(),
            practitioner_type: type,
            username: name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/practitioner`,
        },
      });

      if (signUpError) { setError(signUpError.message); return; }

      if (data.user) {
        setUserId(data.user.id);
        // Pre-fill contact email with signup email
        setContactEmail(email.trim());
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: save practitioner profile ──────────────────────────────────────

  const toggleSpec = (s: string) =>
    setSpecs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!locationCity) { setError("City is required."); return; }
    if (!phone && !contactEmail) { setError("Please provide at least a phone number or contact email."); return; }

    setIsLoading(true);
    try {
      // Use the authenticated user if session exists, otherwise fall back to userId from signup
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const uid = authUser?.id ?? userId;
      if (!uid) throw new Error("Session not found. Please verify your email then sign in to complete your profile.");

      const { error: insertError } = await supabase
        .from("practitioners")
        .upsert(
          {
            user_id:              uid,
            name:                 name.trim(),
            type,
            location_city:        locationCity.trim(),
            location_suburb:      locationSuburb.trim() || null,
            bio:                  bio.trim() || null,
            specialisations:      specs,
            fee_per_session:      fee ? parseInt(fee) : null,
            accepts_medical_aid:  acceptsMedAid,
            telehealth_available: telehealth,
            phone:                phone.trim() || null,
            contact_email:        contactEmail.trim() || null,
            profile_status:       "pending_review",
          },
          { onConflict: "user_id" }
        );

      if (insertError) throw insertError;

      setStep("done");
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Predictiv</h1>
          <p className="text-slate-500 mt-1 text-sm">Practitioner registration</p>
        </div>

        {/* Progress indicator */}
        {step !== "done" && (
          <div className="flex items-center justify-center gap-3 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    step === s
                      ? "bg-blue-600 text-white"
                      : step > s
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  )}
                >
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                <span className={cn("text-xs", step === s ? "text-slate-700 font-medium" : "text-slate-400")}>
                  {s === 1 ? "Account" : "Profile"}
                </span>
                {s < 2 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Create your account</h2>
            <p className="text-sm text-slate-500 mb-6">Basic details to get you started.</p>

            <form onSubmit={handleAccountSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-700">Full name</Label>
                <Input id="name" placeholder="Dr. Jane Smith" value={name}
                  onChange={(e) => setName(e.target.value)} required disabled={isLoading}
                  className="border-slate-200 focus:border-blue-400" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700">Work email</Label>
                <Input id="email" type="email" placeholder="jane@clinic.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required disabled={isLoading}
                  className="border-slate-200 focus:border-blue-400" />
                <p className="text-xs text-slate-400">Patients will use this email to share access.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-slate-700">Role</Label>
                <Select value={type} onValueChange={setType} disabled={isLoading}>
                  <SelectTrigger id="type" className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRACTITIONER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <Input id="password" type="password" placeholder="Min 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required disabled={isLoading}
                  className="border-slate-200 focus:border-blue-400" />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5">
                {isLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account…</>
                  : <>Continue <ChevronRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </form>

            <div className="mt-6 flex flex-col gap-2 items-center">
              <button onClick={() => navigate("/")}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                <ArrowLeft className="h-4 w-4" />Sign in to existing account
              </button>
              <button onClick={() => navigate("/register")}
                className="text-xs text-blue-500 hover:underline">
                Are you a patient? Create a patient account
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Profile ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Complete your profile</h2>
            <p className="text-sm text-slate-500 mb-6">
              This information will appear in Find Help after your account is approved.
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-700">City <span className="text-red-500">*</span></Label>
                  <Input placeholder="Cape Town" value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)} required
                    className="border-slate-200 focus:border-blue-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Suburb</Label>
                  <Input placeholder="Sea Point" value={locationSuburb}
                    onChange={(e) => setLocationSuburb(e.target.value)}
                    className="border-slate-200 focus:border-blue-400" />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700">Bio</Label>
                  <span className={cn("text-xs", bio.length > 280 ? "text-red-500" : "text-slate-400")}>
                    {bio.length}/300
                  </span>
                </div>
                <Textarea
                  placeholder="Brief description of your practice and approach (max 300 characters)"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  rows={3}
                  className="border-slate-200 focus:border-blue-400 resize-none"
                />
              </div>

              {/* Specialisations */}
              <div className="space-y-2">
                <Label className="text-slate-700">Specialisations</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALISATIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpec(s)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        specs.includes(s)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee */}
              <div className="space-y-1.5">
                <Label className="text-slate-700">Consultation fee (R per session)</Label>
                <Input type="number" min="0" placeholder="850" value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="border-slate-200 focus:border-blue-400" />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Medical aid accepted</p>
                    <p className="text-xs text-slate-400">Patients can use medical aid for consultations</p>
                  </div>
                  <Switch checked={acceptsMedAid} onCheckedChange={setAcceptsMedAid} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Telehealth available</p>
                    <p className="text-xs text-slate-400">Online / video consultations available</p>
                  </div>
                  <Switch checked={telehealth} onCheckedChange={setTelehealth} />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Phone</Label>
                  <Input type="tel" placeholder="+27 21 123 4567" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-slate-200 focus:border-blue-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Contact email</Label>
                  <Input type="email" placeholder="bookings@clinic.com" value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="border-slate-200 focus:border-blue-400" />
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)}
                  className="flex-shrink-0">
                  <ArrowLeft className="h-4 w-4 mr-1" />Back
                </Button>
                <Button type="submit" disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving profile…</>
                    : "Submit for Review"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Done ── */}
        {step === "done" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Profile submitted!</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your profile is under review. We'll notify you at <strong>{email}</strong> once approved —
                typically within 1–2 business days.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">What happens next</p>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• Verify your email via the link we sent you</li>
                <li>• We review your profile (1–2 business days)</li>
                <li>• Once approved, you appear in Predictiv's Find Help directory</li>
                <li>• Patients can then share their data with you from Settings</li>
              </ul>
            </div>
            <Button onClick={() => navigate("/")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Sign in to your account
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PractitionerRegister;
