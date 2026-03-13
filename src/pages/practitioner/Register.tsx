// WIREFRAME — Practitioner Registration
// Backend integration points:
// On submit → upsert to user_profiles table
// Required new columns:
//   specialty TEXT, specialty_other TEXT, years_experience INT,
//   qualifications TEXT[], registration_body TEXT, registration_number TEXT,
//   practice_name TEXT, address TEXT, suburb TEXT, city TEXT,
//   telehealth BOOLEAN, in_person BOOLEAN, session_duration_minutes INT,
//   bio TEXT, niche_tags TEXT[], session_fee_min INT, session_fee_max INT,
//   pricing_tier TEXT ('basic' | 'verified'), listing_active BOOLEAN
// After save → set role = 'practitioner_listed' to distinguish from clinical role

import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";

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
  in_person: boolean;
  telehealth: boolean;
  session_duration_minutes: number | null;
  bio: string;
  niche_tags: string[];
  session_fee_min: string;
  session_fee_max: string;
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
  { value: "Other", emoji: "\u2022\u2022\u2022" },
];

const DURATIONS = [30, 45, 60, 90];

const NICHES = [
  "Runners", "Cyclists", "Triathletes", "Trail runners", "Swimmers",
  "Return-to-sport", "Post-surgical", "Lower back", "Knee injuries",
  "Shoulder rehab", "Youth athletes", "Masters athletes",
  "Load management", "Marathon prep", "Ironman prep",
];

const BASIC_FEATURES = [
  "Listed in Find Help marketplace",
  "Yves-powered patient referrals",
  "Direct booking via Predictiv",
];

const VERIFIED_FEATURES = [
  "Everything in Basic",
  "Priority placement in search",
  "Yves anomaly alert notifications",
  "Patient health dashboard access",
  "Verified Partner badge",
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
  in_person: false,
  telehealth: false,
  session_duration_minutes: null,
  bio: "",
  niche_tags: [],
  session_fee_min: "",
  session_fee_max: "",
  pricing_tier: "basic",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const PractitionerRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [qualInput, setQualInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Validation ──────────────────────────────────────────────────────────

  const stepValid = (): boolean => {
    switch (step) {
      case 1:
        return !!form.specialty && (form.specialty !== "Other" || !!form.specialty_other.trim());
      case 2:
        return form.qualifications.length > 0;
      case 3:
        return !!form.suburb.trim() && !!form.city.trim() && (form.in_person || form.telehealth);
      case 4:
        return form.bio.trim().length >= 50;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const next = () => { if (stepValid()) setStep((s) => Math.min(s + 1, 5)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const addQualification = () => {
    const q = qualInput.trim();
    if (q && !form.qualifications.includes(q)) {
      set("qualifications", [...form.qualifications, q]);
      setQualInput("");
    }
  };

  const removeQualification = (q: string) =>
    set("qualifications", form.qualifications.filter((x) => x !== q));

  const toggleNiche = (n: string) =>
    set(
      "niche_tags",
      form.niche_tags.includes(n)
        ? form.niche_tags.filter((x) => x !== n)
        : [...form.niche_tags, n],
    );

  const handleSubmit = () => {
    setSubmitting(true);
    const payload = {
      ...form,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      session_fee_min: form.session_fee_min ? Number(form.session_fee_min) : null,
      session_fee_max: form.session_fee_max ? Number(form.session_fee_max) : null,
      listing_active: true,
      profile_status: "pending_review",
      created_at: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console
    console.log("──── PRACTITIONER REGISTRATION PAYLOAD ────");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload, null, 2));
    // eslint-disable-next-line no-console
    console.log("───────────────────────────────────────────");

    setTimeout(() => {
      setSubmitting(false);
      navigate("/practitioner/dashboard");
    }, 1500);
  };

  // ── Shared styles ───────────────────────────────────────────────────────

  const inputCls =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#6B5ED9] focus:ring-2 focus:ring-[#6B5ED9]/20 transition-all";
  const labelCls = "block text-sm font-medium text-[#333] mb-1.5";
  const hintCls = "text-xs text-[#999] mt-1";

  // ── Step 1 — Specialty ──────────────────────────────────────────────────

  const renderStep1 = () => (
    <div>
      <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">What's your specialty?</h2>
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
    <div>
      <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">Your qualifications</h2>

      {/* Tag input */}
      <div className="mb-2">
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="e.g. BSc Physiotherapy (UCT), Dry Needling Certified, HPCSA Registered"
            value={qualInput}
            onChange={(e) => setQualInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") { e.preventDefault(); addQualification(); }
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
      </div>

      {form.qualifications.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {form.qualifications.map((q) => (
            <span
              key={q}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#6B5ED9] px-3 py-1.5 text-xs font-medium text-white"
            >
              {q}
              <button type="button" onClick={() => removeQualification(q)} className="hover:opacity-70">
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
          <label className={labelCls}>Registration number</label>
          <input
            className={inputCls}
            placeholder="e.g. PT0012345"
            value={form.registration_number}
            onChange={(e) => set("registration_number", e.target.value)}
          />
          <p className={hintCls}>Used for verification only. Not shown on your public listing.</p>
        </div>
      </div>
    </div>
  );

  // ── Step 3 — Location & Availability ────────────────────────────────────

  const renderStep3 = () => (
    <div>
      <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">Where and how do you practice?</h2>

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
      </div>

      {/* Session mode */}
      <div className="mt-8">
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
      </div>

      {/* Session duration */}
      <div className="mt-8">
        <label className={labelCls}>Typical session length</label>
        <div className="mt-2 flex gap-3">
          {DURATIONS.map((d) => {
            const active = form.session_duration_minutes === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => set("session_duration_minutes", active ? null : d)}
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
    </div>
  );

  // ── Step 4 — Bio & Niche ────────────────────────────────────────────────

  const renderStep4 = () => (
    <div>
      <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">Tell patients about yourself</h2>

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
        <p className={`text-xs ${form.bio.length >= 50 ? "text-[#6B5ED9]" : "text-[#aaa]"}`}>
          {form.bio.length} / 600
        </p>
      </div>

      {/* Niche selector */}
      <div className="mt-8">
        <label className={labelCls}>Who do you work with?</label>

        {form.niche_tags.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs text-[#999]">Selected niches</p>
            <div className="flex flex-wrap gap-2">
              {form.niche_tags.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#6B5ED9] px-3 py-1.5 text-xs font-medium text-white"
                >
                  {n}
                  <button type="button" onClick={() => toggleNiche(n)} className="hover:opacity-70">
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
              className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-medium text-[#555] transition-all hover:border-black/20"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 5 — Pricing & Tier ─────────────────────────────────────────────

  const renderStep5 = () => (
    <div>
      <h2 className="mb-6 text-xl font-bold text-[#1a1a1a]">Set your pricing and listing tier</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Min session fee</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#999]">R</span>
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
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#999]">R</span>
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
        Shown on your public listing as "R{form.session_fee_min || "600"}–R{form.session_fee_max || "900"} / visit"
      </p>

      {/* Tier cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
          <p className="text-lg font-bold text-[#1a1a1a]">Basic</p>
          <p className="text-sm font-medium text-[#6B5ED9]">Free</p>
          <p className="mt-0.5 text-xs text-[#888]">10% commission per attended session</p>
          <ul className="mt-4 space-y-2">
            {BASIC_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-[#555]">
                <Check size={14} className="mt-0.5 shrink-0 text-[#6B5ED9]" />
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
            Most popular
          </span>
          <p className="text-lg font-bold text-[#1a1a1a]">Verified Partner</p>
          <p className="text-sm font-medium text-[#6B5ED9]">R1,499 / month</p>
          <ul className="mt-4 space-y-2">
            {VERIFIED_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-[#555]">
                <Check size={14} className="mt-0.5 shrink-0 text-[#6B5ED9]" />
                {f}
              </li>
            ))}
          </ul>
        </button>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6B5ED9] px-6 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#5a4ec5] active:scale-[0.98] disabled:opacity-60"
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

      {submitting && (
        <p className="mt-4 text-center text-sm text-[#6B5ED9]">
          {"\uD83C\uDF89"} Your listing is live! Redirecting to your dashboard…
        </p>
      )}
    </div>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  // ── Layout ──────────────────────────────────────────────────────────────

  const pct = step * 20;

  return (
    <div className="min-h-screen" style={{ background: "#f0ede8" }}>
      {/* Sticky step indicator */}
      <div className="sticky top-0 z-50 border-b border-black/5 backdrop-blur-md" style={{ background: "rgba(240,237,232,0.9)" }}>
        <div className="mx-auto max-w-2xl px-5 pb-3 pt-4">
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
                      current ? "text-[#1a1a1a] font-bold" : done ? "text-[#6B5ED9]" : "text-[#bbb]"
                    }`}
                  >
                    {label}
                  </span>
                  {id < 5 && <span className="mx-1 text-[#ddd]">&middot;</span>}
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
      <div className="mx-auto max-w-xl px-5 py-10">
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          {stepRenderers[step - 1]()}
        </div>

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

        {step === 5 && step > 1 && (
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
