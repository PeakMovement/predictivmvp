// WIREFRAME — Public B2B landing page
// No auth required — this route must be outside ProtectedRoute wrapper in App.tsx
// Stripe/payment integration needed for Verified Partner tier signup
// Analytics events to fire: page_view, cta_click (track which CTA)

import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "40+", label: "Practitioners listed in Cape Town" },
  { value: "Yves-powered", label: "AI referral matching" },
  { value: "R0 setup", label: "Free to list on Basic tier" },
];

const STEPS = [
  {
    num: "01",
    emoji: "\uD83C\uDFE5",
    title: "Build your listing",
    body: "Set your specialty, niches, location and session fee. Your listing goes live in Find Help immediately.",
  },
  {
    num: "02",
    emoji: "\uD83D\uDCCA",
    title: "Yves monitors your patients",
    body: "When a patient\u2019s biometrics flag a concern \u2014 elevated resting HR, HRV drop, poor recovery \u2014 Yves analyses their profile.",
  },
  {
    num: "03",
    emoji: "\uD83C\uDFAF",
    title: "Yves matches and refers",
    body: "If your specialty and niche match the patient\u2019s issue, Yves surfaces your listing and recommends they book with you.",
  },
  {
    num: "04",
    emoji: "\uD83D\uDCB3",
    title: "Patient books, you earn",
    body: "Patient books directly through Predictiv. You keep 90% of the session fee. We invoice nothing upfront.",
  },
];

const BASIC_FEATURES = [
  "Listed in Find Help marketplace",
  "Yves-powered patient matching",
  "Direct booking via Predictiv",
  "10% commission on attended sessions only",
  "No monthly fee, no setup cost",
];

const VERIFIED_FEATURES = [
  "Everything in Basic",
  "Priority ranking in search results",
  "Yves anomaly alerts sent to you directly",
  "Access to patient health dashboard (HRV, sleep, readiness)",
  "Verified Partner badge on your listing",
  "Dedicated account support",
];

const SPECIALTIES = [
  "Physiotherapist",
  "Biokineticist",
  "Sports & Conditioning Coach",
  "Nutritionist",
  "Dietician",
  "Sports GP",
  "Sports Psychologist",
  "Massage Therapist",
  "Podiatrist",
  "Occupational Therapist",
];

// ─── Component ────────────────────────────────────────────────────────────────

export const PractitionerLanding = () => {
  return (
    <div className="min-h-screen" style={{ background: "#f0ede8" }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="text-lg font-semibold text-[#1a1a1a]">
            Predictiv
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-black/5"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-black/5"
            >
              I'm a patient
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
        <span className="mb-5 inline-block rounded-full bg-[#6B5ED9] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white">
          For Practitioners
        </span>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#1a1a1a] sm:text-5xl lg:text-[3.5rem]">
          Your patients are already here.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[#777]">
          Predictiv monitors your patients' HRV, sleep, recovery and training
          load 24/7. When Yves — our AI — detects a pattern that needs your
          expertise, it refers them directly to you.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/practitioner/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[#6B5ED9] px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#5a4ec5] active:scale-[0.98]"
          >
            Create your practitioner account
            <ArrowRight size={18} />
          </Link>
          <button
            onClick={() =>
              document
                .getElementById("how-it-works")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-6 py-3.5 text-sm font-medium text-[#555] transition-colors hover:bg-black/5"
          >
            See how it works
            <span className="text-xs">&#8595;</span>
          </button>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <section className="border-y border-black/5 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-6 px-5 py-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-black/10">
          {STATS.map(({ value, label }) => (
            <div key={value} className="px-10 text-center">
              <p className="text-lg font-bold text-[#1a1a1a]">{value}</p>
              <p className="mt-0.5 text-xs text-[#999]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-5 py-16">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6B5ED9]">
          The Process
        </p>
        <h2 className="mb-12 text-center text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
          How Yves sends you patients
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ num, emoji, title, body }) => (
            <div key={num} className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-[#6B5ED9]/20">{num}</p>
              <span className="mt-2 inline-block text-2xl">{emoji}</span>
              <h3 className="mt-3 text-base font-semibold text-[#1a1a1a]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#777]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Listing tiers ──────────────────────────────────────── */}
      <section style={{ background: "#eae7e1" }}>
        <div className="mx-auto max-w-5xl px-5 py-16">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6B5ED9]">
            Pricing
          </p>
          <h2 className="mb-12 text-center text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
            Choose your tier
          </h2>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* Basic */}
            <div className="rounded-xl border border-black/10 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[#1a1a1a]">Basic</h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Free to list
                </span>
              </div>
              <p className="mt-1.5 text-sm text-[#777]">
                Pay only when patients attend
              </p>
              <hr className="my-5 border-black/5" />
              <ul className="space-y-3">
                {BASIC_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[#333]">
                    <Check size={16} className="mt-0.5 shrink-0 text-[#6B5ED9]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/practitioner/register"
                className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-[#6B5ED9] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5a4ec5]"
              >
                Get listed free
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Verified Partner */}
            <div className="relative rounded-xl border-2 border-[#6B5ED9] bg-white p-7 shadow-sm">
              <span className="absolute -top-3 right-5 rounded-full bg-[#6B5ED9] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Recommended
              </span>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[#1a1a1a]">
                  Verified Partner
                </h3>
              </div>
              <p className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                R1,499 / month
              </p>
              <p className="mt-0.5 text-sm text-[#777]">
                For practices that want priority placement
              </p>
              <hr className="my-5 border-black/5" />
              <ul className="space-y-3">
                {VERIFIED_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[#333]">
                    <Check size={16} className="mt-0.5 shrink-0 text-[#6B5ED9]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/practitioner/register"
                className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-[#6B5ED9] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5a4ec5]"
              >
                Apply for Verified
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Specialties ────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h3 className="mb-6 text-xl font-bold text-[#1a1a1a]">
          Who we work with
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {SPECIALTIES.map((s) => (
            <span
              key={s}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#555]"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ── Final CTA banner ───────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <div className="rounded-2xl bg-[#6B5ED9] px-8 py-16 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to start getting referrals?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-purple-100">
            Join the practitioners already listed in Find Help. Free to start.
          </p>
          <Link
            to="/practitioner/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-[#6B5ED9] shadow-sm transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            Create your practitioner account
            <ArrowRight size={18} />
          </Link>
          <p className="mt-4 text-xs text-purple-200">
            Takes 5 minutes &middot; No credit card required for Basic
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-black/5 py-6 text-center text-sm text-[#888]">
        &copy; 2026 Predictiv &middot;{" "}
        <Link to="/terms" className="hover:text-[#555]">
          Terms
        </Link>{" "}
        &middot;{" "}
        <Link to="/privacy" className="hover:text-[#555]">
          Privacy
        </Link>{" "}
        &middot;{" "}
        <Link to="/register" className="hover:text-[#555]">
          For patients
        </Link>
      </footer>
    </div>
  );
};
