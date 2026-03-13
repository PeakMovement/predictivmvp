// Practitioner Registration (5-step form)
// Upserts to healthcare_practitioners table using auth.uid() as id.
// Columns that don't exist on the table yet are packed into available_times JSON:
//   specialty_other, registration_body, registration_number, practice_name,
//   address, suburb, in_person, session_duration_minutes, niche_tags,
//   session_fee_min, session_fee_max, deposit_required, deposit_amount,
//   pricing_tier, listing_active, role

import { useState, type KeyboardEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  Plus,
  Video,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  specialty: string;
  specialty_other: string;
  years_experience: string;
  qualifications: string[];
  registration_body: string;
  registration_number: string;
  practice_name: string;
  address: string;
  suburb: string;
  city: string;
  province: string;
  in_person: boolean;
  telehealth: boolean;
  session_duration_minutes: number | null;
  accepts_medical_aid: boolean;
  bio: string;
  niche_tags: string[];
  session_fee_min: string;
  session_fee_max: string;
  deposit_required: boolean;
  deposit_amount: string;
  pricing_tier: "basic" | "verified";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Specialty" },
  { id: 2, label: "Qualifications" },
  { id: 3, label: "Location" },
  { id: 4, label: "Bio & Niche" },
  { id: 5, label: "Pricing" },
];

const SPECIALTIES: { value: string; emoji: string }[] = [
  { value: "Physiotherapist", emoji: "\uD83E\uDE7A" },
  { value: "Biokineticist", emoji: "\uD83D\uDCAA" },
  { value: "S&C Coach", emoji: "\uD83C\uDFCB\uFE0F" },
  { value: "Nutritionist", emoji: "\uD83E\uDD57" },
  { value: "Dietician", emoji: "\uD83C\uDF4E" },
  { value: "Sports GP", emoji: "\u2695\uFE0F" },
  { value: "Sports Psychologist", emoji: "\uD83E\uDDE0" },
  { value: "Massage Therapist", emoji: "\uD83D\uDD90\uFE0F" },
  { value: "Podiatrist", emoji: "\uD83E\uDDB6" },
  { value: "Occupational Therapist", emoji: "\uD83E\uDDD1\u200D\u2695\uFE0F" },
  { value: "Other", emoji: "\u2022\u2022\u2022" },
];

const DURATIONS = [30, 45, 60, 90];

const PROVINCES = [
  "Western Cape",
  "Gauteng",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
];

const NICHES = [
  "Runners",
  "Cyclists",
  "Triathletes",
  "Trail runners",
  "Swimmers",
  "CrossFit",
  "Rugby",
  "Cricket",
  "Soccer",
  "Tennis",
  "Return-to-sport",
  "Post-surgical",
  "Lower back",
  "Knee injuries",
  "Shoulder rehab",
  "Hip & pelvis",
  "Ankle & foot",
  "Youth athletes",
  "Masters athletes",
  "Load management",
  "Marathon prep",
  "Ironman prep",
  "Chronic pain",
  "Concussion management",
];

const BASIC_FEATURES_YES = [
  "Listed in Find Help marketplace",
  "Yves-powered patient referrals",
  "Direct booking via Predictiv",
  "10% commission on attended sessions only",
  "No monthly fee, no setup cost",
];

const BASIC_FEATURES_NO = [
  "Priority placement in search",
  "Yves anomaly alert notifications",
  "Patient health dashboard access",
  "Verified Partner badge",
  "Dedicated account support",
];

const VERIFIED_FEATURES = [
  "Everything in Basic",
  "Priority placement in search",
  "Yves anomaly alert notifications",
  "Patient health dashboard access",
  "Verified Partner badge",
  "Dedicated account support",
];

const INITIAL: FormData = {
  specialty: "",
  specialty_other: "",
  years_experience: "",
  qualifications: [],
  registration_body: "",
  registration_number: "",
  practice_name: "",
  address: "",
  suburb: "",
  city: "Cape Town",
  province: "Western Cape",
  in_person: false,
  telehealth: false,
  session_duration_minutes: null,
  accepts_medical_aid: false,
  bio: "",
  niche_tags: [],
  session_fee_min: "",
  session_fee_max: "",
  deposit_required: false,
  deposit_amount: "",
  pricing_tier: "basic",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const PractitionerRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [qualInput, setQualInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Validation ──────────────────────────────────────────────────────────

  const stepValid = (): boolean => {
    switch (step) {
      case 1:
        return (
          !!form.specialty &&
          (form.specialty !== "Other" || !!form.specialty_other.trim())
        );
      case 2:
        return form.qualifications.length > 0;
      case 3:
        return (
          !!form.suburb.trim() &&
          !!form.city.trim() &&
          (form.in_person || form.telehealth)
        );
      case 4:
        return form.bio.trim().length >= 100;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const next = () => {
    if (stepValid()) setStep((s) => Math.min(s + 1, 5));
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const addQualification = () => {
    const q = qualInput.trim();
    if (q && !form.qualifications.includes(q)) {
      set("qualifications", [...form.qualifications, q]);
      setQualInput("");
    }
  };

  const removeQualification = (q: string) =>
    set(
      "qualifications",
      form.qualifications.filter((x) => x !== q),
    );

  const toggleNiche = (n: string) => {
    if (form.niche_tags.includes(n)) {
      set(
        "niche_tags",
        form.niche_tags.filter((x) => x !== n),
      );
    } else if (form.niche_tags.length < 8) {
      set("niche_tags", [...form.niche_tags, n]);
    }
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const displaySpecialtyValue =
        form.specialty === "Other" && form.specialty_other
          ? form.specialty_other
          : form.specialty;

      const locationStr = [form.suburb, form.city].filter(Boolean).join(", ");

      // Fields that map directly to healthcare_practitioners columns
      const row = {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email ?? "Practitioner",
        title: displaySpecialtyValue,
        specialty: displaySpecialtyValue,
        location: locationStr || "Cape Town",
        city: form.city || null,
        province: form.province || null,
        bio: form.bio || null,
        qualifications: form.qualifications.length > 0 ? form.qualifications : null,
        years_experience: form.years_experience ? Number(form.years_experience) : null,
        accepts_medical_aid: form.accepts_medical_aid,
        online_available: form.telehealth,
        consultation_fee: form.session_fee_min ? Number(form.session_fee_min) : null,
        contact_email: user.email ?? null,
        profile_image_url: null as string | null,
        // Pack extra fields into available_times JSON
        available_times: {
          specialty_other: form.specialty_other || null,
          registration_body: form.registration_body || null,
          registration_number: form.registration_number || null,
          practice_name: form.practice_name || null,
          address: form.address || null,
          suburb: form.suburb || null,
          in_person: form.in_person,
          telehealth: form.telehealth,
          session_duration_minutes: form.session_duration_minutes,
          niche_tags: form.niche_tags,
          session_fee_min: form.session_fee_min ? Number(form.session_fee_min) : null,
          session_fee_max: form.session_fee_max ? Number(form.session_fee_max) : null,
          deposit_required: form.deposit_required,
          deposit_amount: form.deposit_required && form.deposit_amount ? Number(form.deposit_amount) : null,
          pricing_tier: form.pricing_tier,
          listing_active: true,
          role: "practitioner",
        },
      };

      const { error } = await supabase
        .from("healthcare_practitioners")
        .upsert(row, { onConflict: "id" });

      if (error) {
        // eslint-disable-next-line no-console
        console.error("Upsert error:", error);
        throw new Error(error.message || "Database error");
      }

      // eslint-disable-next-line no-console
      console.log("Practitioner listing saved successfully for", user.id);

      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => navigate("/practitioner/dashboard"), 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Something went wrong";
      // eslint-disable-next-line no-console
      console.error("Registration submit failed:", err);
      setSubmitError(message);
      setSubmitting(false);
    }
  };

  // ── Shared styles ───────────────────────────────────────────────────────

  const inputCls =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#6B5ED9] focus:ring-2 focus:ring-[#6B5ED9]/20 transition-all";
  const labelCls = "block text-sm font-medium text-[#333] mb-1.5";
  const hintCls = "text-xs text-[#999] mt-1";
  const cardCls = "rounded-xl bg-white p-6 shadow-sm sm:p-8";

  // ── Success state ─────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#f0ede8" }}
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a]">
            Your listing is live!
          </h2>
          <p className="mt-2 text-sm text-[#888]">
            Redirecting to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1 — Specialty ──────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className={cardCls}>
      <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">
        What's your specialty?
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {SPECIALTIES.map(({ value, emoji }) => {
          const active = form.specialty === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => set("specialty", value)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                active
                  ? "border-[#6B5ED9] bg-[#f0ebff]"
                  : "border-black/10 bg-white hover:border-black/20"
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-medium text-[#333]">{value}</span>
            </button>
          );
        })}
      </div>

      {form.specialty === "Other" && (
        <div className="mt-4">
          <label className={labelCls}>Please specify your specialty</label>
          <input
            className={inputCls}
            placeholder="e.g. Podiatrist"
            value={form.specialty_other}
            onChange={(e) => set("specialty_other", e.target.value)}
          />
        </div>
      )}

      <div className="mt-6">
        <label className={labelCls}>Years of experience</label>
        <input
          className={inputCls}
          type="number"
          min="0"
          max="50"
          placeholder="e.g. 8"
          value={form.years_experience}
          onChange={(e) => set("years_experience", e.target.value)}
        />
      </div>
    </div>
  );

  // ── Step 2 — Qualifications ─────────────────────────────────────────────

  const renderStep2 = () => (
    <div className={cardCls}>
      <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">
        Your qualifications
      </h2>

      {/* Tag input */}
      <div className="mb-2">
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="e.g. BSc Physiotherapy (UCT), Dry Needling Certified"
            value={qualInput}
            onChange={(e) => setQualInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addQualification();
              }
            }}
          />
          <button
            type="button"
            onClick={addQualification}
            className="flex shrink-0 items-center gap-1 rounded-xl border border-[#6B5ED9] px-4 py-3 text-sm font-medium text-[#6B5ED9] transition-colors hover:bg-[#6B5ED9]/5"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
        <p className={hintCls}>
          <span className="text-[#bbb]">
            Examples: BSc Physiotherapy (UCT) · Dry Needling Certified · CSCS ·
            PG Dip Sports Medicine
          </span>
        </p>
      </div>

      {form.qualifications.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {form.qualifications.map((q) => (
            <span
              key={q}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#6B5ED9] px-3 py-1.5 text-xs font-medium text-white"
            >
              {q}
              <button
                type="button"
                onClick={() => removeQualification(q)}
                className="hover:opacity-70"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className={labelCls}>Registration body</label>
          <input
            className={inputCls}
            placeholder="HPCSA, ESSA, DIETSA, SASMA..."
            value={form.registration_body}
            onChange={(e) => set("registration_body", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Registration / HPCSA number</label>
          <input
            className={inputCls}
            placeholder="e.g. PT0012345"
            value={form.registration_number}
            onChange={(e) => set("registration_number", e.target.value)}
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <Lock size={12} className="text-amber-500" />
            <p className="text-xs text-amber-600">
              Used for verification only. Never shown on your public listing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3 — Location & Availability ────────────────────────────────────

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Card 1: Practice address */}
      <div className={cardCls}>
        <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">
          Practice location
        </h2>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Practice / clinic name</label>
            <input
              className={inputCls}
              placeholder="e.g. PhysioFit Claremont"
              value={form.practice_name}
              onChange={(e) => set("practice_name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Street address</label>
            <input
              className={inputCls}
              placeholder="e.g. 12 Main Road"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Suburb *</label>
              <input
                className={inputCls}
                placeholder="e.g. Claremont"
                value={form.suburb}
                onChange={(e) => set("suburb", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <input
                className={inputCls}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Province</label>
            <select
              className={inputCls}
              value={form.province}
              onChange={(e) => set("province", e.target.value)}
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Card 2: Availability */}
      <div className={cardCls}>
        <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">
          Session availability
        </h2>

        {/* Session mode */}
        <div>
          <label className={labelCls}>How do you see patients? *</label>
          <div className="mt-2 flex gap-3">
            {(["In-person", "Telehealth"] as const).map((mode) => {
              const key = mode === "In-person" ? "in_person" : "telehealth";
              const active = form[key];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set(key, !active)}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#6B5ED9] text-white"
                      : "border border-black/10 bg-white text-[#555] hover:border-black/20"
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
          <p className={hintCls}>Select one or both</p>
        </div>

        {/* Session duration */}
        <div className="mt-6">
          <label className={labelCls}>Typical session length</label>
          <div className="mt-2 flex gap-3">
            {DURATIONS.map((d) => {
              const active = form.session_duration_minutes === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    set("session_duration_minutes", active ? null : d)
                  }
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#6B5ED9] text-white"
                      : "border border-black/10 bg-white text-[#555] hover:border-black/20"
                  }`}
                >
                  {d} min
                </button>
              );
            })}
          </div>
        </div>

        {/* Medical aid */}
        <div className="mt-6">
          <label className={labelCls}>Do you accept medical aid?</label>
          <div className="mt-2 flex gap-3">
            {(["Yes", "No"] as const).map((opt) => {
              const active =
                opt === "Yes"
                  ? form.accepts_medical_aid
                  : !form.accepts_medical_aid;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    set("accepts_medical_aid", opt === "Yes")
                  }
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#6B5ED9] text-white"
                      : "border border-black/10 bg-white text-[#555] hover:border-black/20"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 4 — Bio & Niche ────────────────────────────────────────────────

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Card 1: Bio + photo */}
      <div className={cardCls}>
        <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">
          Tell patients about yourself
        </h2>

        <textarea
          className={`${inputCls} min-h-[160px] resize-none`}
          placeholder="Write in first person. Describe your approach, who you work with best, and what makes you different. Yves reads this to match you with the right patients."
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          maxLength={600}
        />
        <div className="mt-1 flex items-center justify-between">
          <p className={hintCls}>
            Tip: mention the sports, injuries, or conditions you specialise in.
          </p>
          <p
            className={`text-xs ${form.bio.length >= 100 ? "text-[#6B5ED9]" : "text-[#aaa]"}`}
          >
            {form.bio.length} / 600
          </p>
        </div>
        {form.bio.length > 0 && form.bio.length < 100 && (
          <p className="mt-1 text-xs text-amber-600">
            Minimum 100 characters ({100 - form.bio.length} more needed)
          </p>
        )}

        {/* Profile photo placeholder */}
        <div className="mt-6">
          <label className={labelCls}>Profile photo</label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black/5">
              <Camera size={24} className="text-[#bbb]" />
            </div>
            <div>
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#555] transition-colors hover:bg-black/5"
              >
                Upload photo
              </button>
              <p className={hintCls}>
                Coming soon — photo upload will be available in the next update.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Niche selector */}
      <div className={cardCls}>
        <div className="mb-4 flex items-center justify-between">
          <label className={`${labelCls} mb-0`}>Who do you work with?</label>
          <span
            className={`text-xs font-medium ${form.niche_tags.length >= 8 ? "text-amber-600" : "text-[#999]"}`}
          >
            {form.niche_tags.length} / 8 selected
          </span>
        </div>

        {form.niche_tags.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs text-[#999]">Selected niches</p>
            <div className="flex flex-wrap gap-2">
              {form.niche_tags.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#6B5ED9] px-3 py-1.5 text-xs font-medium text-white"
                >
                  {n}
                  <button
                    type="button"
                    onClick={() => toggleNiche(n)}
                    className="hover:opacity-70"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {NICHES.filter((n) => !form.niche_tags.includes(n)).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => toggleNiche(n)}
              disabled={form.niche_tags.length >= 8}
              className={`rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-medium text-[#555] transition-all ${
                form.niche_tags.length >= 8
                  ? "cursor-not-allowed opacity-40"
                  : "hover:border-black/20"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 5 — Pricing & Go Live ──────────────────────────────────────────

  const displaySpecialty =
    form.specialty === "Other" && form.specialty_other
      ? form.specialty_other
      : form.specialty || "Physiotherapist";
  const displayNiches =
    form.niche_tags.length > 0
      ? form.niche_tags.slice(0, 3).join(" · ")
      : "Runners · Cyclists";
  const displaySuburb = form.suburb || "Claremont";
  const displayCity = form.city || "Cape Town";
  const displayYears = form.years_experience || "8";
  const displayFeeMin = form.session_fee_min || "600";
  const displayFeeMax = form.session_fee_max || "900";
  const displayBio =
    form.bio ||
    "I'm a physiotherapist with 8 years of experience working with endurance athletes. I specialise in running injuries and post-surgical rehabilitation. My approach combines manual therapy with...";

  const renderStep5 = () => (
    <div className="space-y-6">
      {/* Card 1: Pricing */}
      <div className={cardCls}>
        <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">
          Set your pricing
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Min session fee</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#999]">
                R
              </span>
              <input
                className={`${inputCls} pl-8`}
                type="number"
                min="0"
                placeholder="600"
                value={form.session_fee_min}
                onChange={(e) => set("session_fee_min", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Max session fee</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#999]">
                R
              </span>
              <input
                className={`${inputCls} pl-8`}
                type="number"
                min="0"
                placeholder="900"
                value={form.session_fee_max}
                onChange={(e) => set("session_fee_max", e.target.value)}
              />
            </div>
          </div>
        </div>
        <p className={hintCls}>
          Shown on your public listing as "R{displayFeeMin}–R{displayFeeMax} /
          visit"
        </p>

        {/* Deposit option */}
        <div className="mt-6">
          <label className={labelCls}>Require a booking deposit?</label>
          <div className="mt-2 flex gap-3">
            {(["Yes", "No"] as const).map((opt) => {
              const active =
                opt === "Yes"
                  ? form.deposit_required
                  : !form.deposit_required;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set("deposit_required", opt === "Yes")}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#6B5ED9] text-white"
                      : "border border-black/10 bg-white text-[#555] hover:border-black/20"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {form.deposit_required && (
            <div className="mt-3">
              <label className={labelCls}>Deposit amount</label>
              <div className="relative max-w-[200px]">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#999]">
                  R
                </span>
                <input
                  className={`${inputCls} pl-8`}
                  type="number"
                  min="0"
                  placeholder="200"
                  value={form.deposit_amount}
                  onChange={(e) => set("deposit_amount", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Tier selection */}
      <div className={cardCls}>
        <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">
          Choose your listing tier
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Basic */}
          <button
            type="button"
            onClick={() => set("pricing_tier", "basic")}
            className={`rounded-xl border p-5 text-left transition-all ${
              form.pricing_tier === "basic"
                ? "border-[#6B5ED9] bg-[#f0ebff]/50"
                : "border-black/10 bg-white hover:border-black/20"
            }`}
          >
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-[#1a1a1a]">Basic</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                Free
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#888]">
              10% commission per attended session
            </p>
            <hr className="my-4 border-black/5" />
            <ul className="space-y-2">
              {BASIC_FEATURES_YES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-xs text-[#555]"
                >
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-[#6B5ED9]"
                  />
                  {f}
                </li>
              ))}
              {BASIC_FEATURES_NO.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-xs text-[#bbb]"
                >
                  <X size={14} className="mt-0.5 shrink-0 text-[#ccc]" />
                  {f}
                </li>
              ))}
            </ul>
          </button>

          {/* Verified Partner */}
          <button
            type="button"
            onClick={() => set("pricing_tier", "verified")}
            className={`relative rounded-xl border p-5 text-left transition-all ${
              form.pricing_tier === "verified"
                ? "border-[#6B5ED9] bg-[#f0ebff]/50"
                : "border-black/10 bg-white hover:border-black/20"
            }`}
          >
            <span className="absolute -top-2.5 right-4 rounded-full bg-[#6B5ED9] px-2.5 py-0.5 text-[10px] font-semibold text-white">
              Recommended
            </span>
            <p className="text-lg font-bold text-[#1a1a1a]">
              Verified Partner
            </p>
            <p className="text-sm font-medium text-[#6B5ED9]">
              R1,499 / month
            </p>
            <hr className="my-4 border-black/5" />
            <ul className="space-y-2">
              {VERIFIED_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-xs text-[#555]"
                >
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-[#6B5ED9]"
                  />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        </div>
      </div>

      {/* Card 3: Listing preview */}
      <div className={cardCls}>
        <h2 className="mb-4 text-xl font-bold text-[#1a1a1a]">
          Listing preview
        </h2>
        <p className="mb-5 text-xs text-[#999]">
          This is how your listing will appear in Find Help
        </p>

        <div className="rounded-xl border border-black/10 bg-white p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#1a1a1a]">
                Your Name
              </h3>
              <p className="mt-0.5 text-xs font-medium text-[#6B5ED9]">
                {displaySpecialty}
              </p>
              <p className="mt-0.5 text-xs text-[#888]">{displayNiches}</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-amber-400">&#9733;</span>
              <span className="font-medium text-[#333]">&mdash;</span>
            </div>
          </div>

          {/* Details */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#888]">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {displaySuburb}, {displayCity}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {displayYears} yrs exp
            </span>
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs font-medium text-[#555]">
              R{displayFeeMin}–R{displayFeeMax} / visit
            </span>
            {form.accepts_medical_aid && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <CheckCircle2
                  size={10}
                  className="mr-1 inline-block align-text-top"
                />
                Medical Aid
              </span>
            )}
            {form.telehealth && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                <Video
                  size={10}
                  className="mr-1 inline-block align-text-top"
                />
                Telehealth
              </span>
            )}
          </div>

          {/* Bio */}
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#888]">
            {displayBio}
          </p>

          {/* Disabled buttons */}
          <div className="mt-4 flex gap-2">
            <span className="flex-1 rounded-lg bg-black/5 py-2 text-center text-sm font-medium text-[#bbb]">
              Book
            </span>
            <span className="rounded-lg border border-black/5 px-4 py-2 text-center text-sm font-medium text-[#bbb]">
              Profile
            </span>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#ccc]">
            Preview only
          </p>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6B5ED9] px-6 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#5a4ec5] active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Saving…
          </span>
        ) : (
          <>
            Complete my listing
            <ArrowRight size={18} />
          </>
        )}
      </button>

      {submitError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          {submitError}
        </div>
      )}
    </div>
  );

  const stepRenderers = [
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
  ];

  // ── Layout ──────────────────────────────────────────────────────────────

  const pct = step * 20;

  return (
    <div className="min-h-screen" style={{ background: "#f0ede8" }}>
      {/* Sticky header with step indicator */}
      <div
        className="sticky top-0 z-50 border-b border-black/5 backdrop-blur-md"
        style={{ background: "rgba(240,237,232,0.9)" }}
      >
        <div className="mx-auto max-w-2xl px-5 pb-3 pt-4">
          {/* Title */}
          <h1 className="text-center text-lg font-bold text-[#1a1a1a]">
            Set up your practitioner listing
          </h1>
          <p className="mb-4 text-center text-xs text-[#999]">
            Complete all 5 steps to go live in Find Help
          </p>

          {/* Step circles */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map(({ id, label }) => {
              const done = id < step;
              const current = id === step;
              return (
                <button
                  key={id}
                  onClick={() => id < step && setStep(id)}
                  disabled={id > step}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      done
                        ? "bg-[#6B5ED9] text-white"
                        : current
                          ? "bg-[#6B5ED9] text-white"
                          : "bg-black/8 text-[#bbb]"
                    }`}
                  >
                    {done ? <Check size={12} /> : id}
                  </span>
                  <span
                    className={`hidden text-xs font-medium sm:inline ${
                      current
                        ? "font-bold text-[#1a1a1a]"
                        : done
                          ? "text-[#6B5ED9]"
                          : "text-[#bbb]"
                    }`}
                  >
                    {label}
                  </span>
                  {id < 5 && (
                    <span className="mx-1 text-[#ddd]">&middot;</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 w-full rounded-full bg-black/5">
            <div
              className="h-full rounded-full bg-[#6B5ED9] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form body */}
      <div className="mx-auto max-w-2xl px-5 py-10">
        {/* Back to listing overview — only on Step 1 */}
        {step === 1 && (
          <Link
            to="/join"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B5ED9] hover:underline"
          >
            <ArrowLeft size={14} />
            Back to listing overview
          </Link>
        )}

        {stepRenderers[step - 1]()}

        {/* Navigation */}
        {step < 5 && (
          <div className="mt-6 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={back}
                className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-medium text-[#555] shadow-sm transition-all hover:bg-black/5"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <span />
            )}

            <button
              onClick={next}
              disabled={!stepValid()}
              className="flex items-center gap-2 rounded-xl bg-[#6B5ED9] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#5a4ec5] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="mt-6">
            <button
              onClick={back}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-medium text-[#555] shadow-sm transition-all hover:bg-black/5"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
