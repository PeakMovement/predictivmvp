// Practitioner Self-Service Dashboard
// Reads from profiles where id = auth.uid()
// Tab 1 stats — placeholders (phase 2)
// Tab 3 referrals — phase 2 empty state

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  MapPin,
  Stethoscope,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PractitionerData {
  name: string;
  email: string;
  specialty: string;
  niche_tags: string[];
  city: string;
  suburb: string;
  years_experience: number | null;
  session_fee_min: number | null;
  session_fee_max: number | null;
  telehealth: boolean;
  in_person: boolean;
  bio: string;
  qualifications: string[];
  registration_body: string;
  registration_number: string;
  pricing_tier: string;
  listing_active: boolean;
  profile_photo_url: string | null;
  joined: string;
}

// ─── Checklist helper ─────────────────────────────────────────────────────────

function buildChecklist(p: PractitionerData) {
  return [
    { label: "Specialty selected", done: !!p.specialty },
    { label: "Qualifications added", done: p.qualifications.length > 0 },
    { label: "Location set", done: !!p.city || !!p.suburb },
    { label: "Bio written", done: p.bio.length >= 100 },
    {
      label: "Profile photo uploaded",
      done: !!p.profile_photo_url,
      action: "Add photo",
      href: "/practitioner/register",
    },
    {
      label: "Upgraded to Verified Partner",
      done: p.pricing_tier === "verified",
      action: "Upgrade",
      href: "/practitioner/register",
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PractitionerDashboard = () => {
  const [tab, setTab] = useState<"overview" | "listing" | "referrals">(
    "overview",
  );
  const [p, setP] = useState<PractitionerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile, error: fetchErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (fetchErr) throw fetchErr;

        if (!profile || !profile.listing_active) {
          setError("No practitioner listing found. Create one first.");
          setLoading(false);
          return;
        }

        const joined = profile.updated_at
          ? new Date(profile.updated_at).toLocaleDateString("en-ZA", {
              year: "numeric",
              month: "long",
            })
          : "Recently";

        setP({
          name: profile.full_name ?? user.email ?? "Practitioner",
          email: user.email ?? "",
          specialty: profile.specialty ?? "",
          niche_tags: Array.isArray(profile.niche_tags) ? profile.niche_tags : [],
          city: profile.city ?? "",
          suburb: profile.suburb ?? "",
          years_experience: profile.years_experience ?? null,
          session_fee_min: profile.session_fee_min ?? null,
          session_fee_max: profile.session_fee_max ?? null,
          telehealth: profile.telehealth ?? false,
          in_person: profile.in_person ?? false,
          bio: profile.bio ?? "",
          qualifications: Array.isArray(profile.qualifications) ? profile.qualifications : [],
          registration_body: profile.registration_body ?? "",
          registration_number: profile.registration_number ?? "",
          pricing_tier: profile.pricing_tier ?? "basic",
          listing_active: profile.listing_active ?? false,
          profile_photo_url: profile.avatar_url ?? null,
          joined,
        });
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load profile",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const TABS = [
    { id: "overview" as const, label: "Overview" },
    { id: "listing" as const, label: "My Listing" },
    { id: "referrals" as const, label: "Referrals" },
  ];

  // ── Loading skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#f0ede8" }}>
        <div className="border-b border-black/5" style={{ background: "rgba(240,237,232,0.95)" }}>
          <div className="mx-auto max-w-4xl px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Stethoscope size={20} className="text-[#6B5ED9]" />
              <div className="h-5 w-40 animate-pulse rounded bg-black/10" />
            </div>
          </div>
          <div className="mx-auto max-w-4xl px-5 pb-3">
            <div className="flex gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-16 animate-pulse rounded bg-black/10" />
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-5 py-8 space-y-6">
          <div className="h-32 animate-pulse rounded-xl bg-white/60" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white/60" />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-xl bg-white/60" />
        </div>
      </div>
    );
  }

  // ── Error / no listing state ────────────────────────────────────────────

  if (error || !p) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#f0ede8" }}
      >
        <div className="text-center">
          <Stethoscope size={32} className="mx-auto mb-3 text-[#6B5ED9]" />
          <h2 className="text-lg font-bold text-[#1a1a1a]">
            {error ?? "No listing found"}
          </h2>
          <p className="mt-2 text-sm text-[#888]">
            No practitioner listing found. Create one first.
          </p>
          <Link
            to="/practitioner/register"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#6B5ED9] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#5a4ec5]"
          >
            Create your listing
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#f0ede8" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 border-b border-black/5"
        style={{ background: "rgba(240,237,232,0.95)" }}
      >
        <div className="mx-auto max-w-4xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Stethoscope size={20} className="text-[#6B5ED9]" />
              <h1 className="text-lg font-semibold text-[#1a1a1a]">
                Practitioner Portal
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden text-xs text-[#999] sm:inline">
                {p.email}
              </span>
              <Link
                to="/find-help"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#6B5ED9] hover:underline"
              >
                View my listing in Find Help
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-4xl px-5">
          <div className="flex gap-6">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  tab === id
                    ? "border-[#6B5ED9] text-[#6B5ED9]"
                    : "border-transparent text-[#999] hover:text-[#555]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-4xl px-5 py-8">
        {tab === "overview" && <OverviewTab p={p} />}
        {tab === "listing" && <ListingTab p={p} />}
        {tab === "referrals" && <ReferralsTab />}
      </div>
    </div>
  );
};

// ─── Tab 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ p }: { p: PractitionerData }) {
  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1a1a1a]">
          Welcome back, {p.name.split(" ")[0]}.
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {p.listing_active ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Listing active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Listing paused
            </span>
          )}
          <span className="text-[#ccc]">&middot;</span>
          <span className="rounded-full bg-black/5 px-3 py-1 font-medium text-[#555]">
            {p.pricing_tier === "verified" ? "Verified Partner" : "Basic tier"}
          </span>
          <span className="text-[#ccc]">&middot;</span>
          <span className="text-[#999]">Member since {p.joined}</span>
        </div>
        <Link
          to="/practitioner/register"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B5ED9] hover:underline"
        >
          Edit my listing
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Eye} label="Profile views this month" value="—" />
        <StatCard icon={Users} label="Referrals from Yves" value="—" />
        <StatCard icon={BookOpen} label="Bookings confirmed" value="—" />
        <StatCard icon={TrendingUp} label="Commission earned" value="—" />
      </div>

      {/* How Yves works */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-6 text-base font-semibold text-[#1a1a1a]">
          How Yves refers patients to you
        </h3>

        <div className="grid gap-6 sm:grid-cols-4">
          {[
            {
              num: "01",
              emoji: "\uD83D\uDD0D",
              title: "Patient describes their issue",
              body: "They type in plain language: \u2018My knee hurts after runs.\u2019 No forms, no checkboxes.",
            },
            {
              num: "02",
              emoji: "\uD83E\uDD16",
              title: "Yves analyses and matches",
              body: "Yves reads their health data, symptom description, and matches against your specialty and niche tags.",
            },
            {
              num: "03",
              emoji: "\uD83D\uDCCB",
              title: "Your listing surfaces",
              body: "If you\u2019re the right fit, your card appears in their results with a recommended match score.",
            },
            {
              num: "04",
              emoji: "\u2705",
              title: "Patient books, you\u2019re notified",
              body: "They book directly. You receive 90% of the session fee. Commission is deducted automatically.",
            },
          ].map(({ num, emoji, title, body }) => (
            <div key={num} className="relative">
              <p className="text-3xl font-bold text-[#6B5ED9]/20">{num}</p>
              <span className="mt-1 inline-block text-xl">{emoji}</span>
              <h4 className="mt-2 text-sm font-semibold text-[#1a1a1a]">
                {title}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-[#777]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA — only for basic tier */}
      {p.pricing_tier === "basic" && (
        <div className="rounded-xl bg-[#6B5ED9]/10 p-6">
          <h3 className="text-base font-bold text-[#1a1a1a]">
            Upgrade to Verified Partner
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[#555]">
            Get priority placement, patient health data access, and Yves anomaly
            alerts sent directly to you.
          </p>
          <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#6B5ED9] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#5a4ec5] active:scale-[0.98]">
            Upgrade for R1,499/month
            <ArrowRight size={16} />
          </button>
          <p className="mt-2 text-xs text-[#999]">
            Cancel anytime &middot; No setup fee
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: My Listing ────────────────────────────────────────────────────────

function ListingTab({ p }: { p: PractitionerData }) {
  const bioSnippet =
    p.bio.length > 120 ? p.bio.slice(0, 120) + "\u2026" : p.bio;
  const nicheLabel =
    p.niche_tags.length > 0
      ? p.niche_tags.slice(0, 2).join(" & ")
      : "General practice";
  const checklist = buildChecklist(p);
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#1a1a1a]">
          How your listing appears in Find Help
        </h2>
        <p className="mt-1 text-sm text-[#888]">
          This is exactly what patients see when Yves matches them to you.
        </p>
      </div>

      {/* Listing preview card */}
      <div className="max-w-md rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[#1a1a1a]">
              {p.name}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-[#6B5ED9]">
              {p.specialty}
            </p>
            <p className="mt-0.5 text-xs text-[#888]">{nicheLabel}</p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-amber-400">&#9733;</span>
            <span className="font-medium text-[#333]">—</span>
          </div>
        </div>

        {/* Location + experience */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#888]">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {[p.suburb, p.city].filter(Boolean).join(", ") || "South Africa"}
          </span>
          {p.years_experience != null && p.years_experience > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {p.years_experience} yrs exp
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(p.session_fee_min != null || p.session_fee_max != null) && (
            <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs font-medium text-[#555]">
              R{p.session_fee_min ?? "?"}&ndash;R{p.session_fee_max ?? "?"} /
              visit
            </span>
          )}
          {p.telehealth && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2
                size={10}
                className="mr-1 inline-block align-text-top"
              />
              Telehealth
            </span>
          )}
          {p.in_person && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
              <Video
                size={10}
                className="mr-1 inline-block align-text-top"
              />
              In-person
            </span>
          )}
        </div>

        {/* Bio */}
        <p className="mt-3 text-xs leading-relaxed text-[#888]">
          {bioSnippet || "No bio yet."}
        </p>

        {/* Niche tags */}
        {p.niche_tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.niche_tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-0.5 text-[11px] font-medium text-[#777]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

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
          Preview only — this is how patients see your card
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/practitioner/register"
          className="inline-flex items-center gap-2 rounded-xl bg-[#6B5ED9] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#5a4ec5] active:scale-[0.98]"
        >
          Edit listing details
          <ArrowRight size={16} />
        </Link>
        <button
          onClick={() =>
            alert(
              "Pausing your listing will hide it from Find Help. Feature coming soon.",
            )
          }
          className="text-sm font-medium text-[#999] hover:text-[#555] hover:underline"
        >
          Pause listing
        </button>
      </div>

      {/* Listing checklist */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-[#1a1a1a]">
          Make your listing stronger
        </h3>
        <p className="mt-1 text-sm text-[#888]">
          Practitioners with complete listings get 3x more referrals from Yves.
        </p>

        <div className="mt-5 space-y-3">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              {item.done ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </span>
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/10" />
              )}
              <span
                className={`text-sm ${item.done ? "text-[#333]" : "text-[#999]"}`}
              >
                {item.label}
              </span>
              {!item.done && item.action && (
                <Link
                  to={item.href!}
                  className="ml-auto text-xs font-medium text-[#6B5ED9] hover:underline"
                >
                  {item.action} &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#333]">
              {doneCount} / {checklist.length} complete
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-black/5">
            <div
              className="h-full rounded-full bg-[#6B5ED9] transition-all"
              style={{
                width: `${(doneCount / checklist.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Referrals ─────────────────────────────────────────────────────────

function ReferralsTab() {
  return (
    <div className="space-y-6">
      {/* Empty state */}
      <div className="flex flex-col items-center rounded-xl bg-white py-16 text-center shadow-sm">
        <span className="mb-4 text-4xl">{"\uD83D\uDCCB"}</span>
        <h2 className="text-lg font-bold text-[#1a1a1a]">
          Referral tracking coming in Phase 2
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#888]">
          When Yves routes a patient to you because of your specialty or niche
          tags, it will appear here. You&apos;ll see the referral source,
          whether they booked, and your commission earned per session.
        </p>
      </div>

      {/* Greyed-out preview table */}
      <div className="relative rounded-xl bg-white p-6 shadow-sm">
        <div className="opacity-30">
          <div className="grid grid-cols-5 gap-4 border-b border-black/5 pb-3 text-xs font-semibold text-[#555]">
            <span>Patient</span>
            <span>Issue</span>
            <span>Referred</span>
            <span>Booked</span>
            <span>Commission</span>
          </div>

          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="grid grid-cols-5 gap-4 border-b border-black/5 py-3"
            >
              <div className="h-3 w-20 rounded bg-black/10" />
              <div className="h-3 w-24 rounded bg-black/10" />
              <div className="h-3 w-16 rounded bg-black/10" />
              <div className="h-3 w-10 rounded bg-black/10" />
              <div className="h-3 w-14 rounded bg-black/10" />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-[#6B5ED9]/10 px-4 py-1.5 text-xs font-medium text-[#6B5ED9]">
            Available once your first referral is received
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B5ED9]/10">
        <Icon size={16} className="text-[#6B5ED9]" />
      </div>
      <p className="text-2xl font-bold text-[#1a1a1a]">{value}</p>
      <p className="text-xs text-[#888]">{label}</p>
      <p className="mt-0.5 text-[10px] italic text-[#bbb]">Coming soon</p>
    </div>
  );
}
