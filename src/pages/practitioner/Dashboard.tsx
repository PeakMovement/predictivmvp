// WIREFRAME — Practitioner Self-Service Dashboard
// Backend integration points:
// - Fetch practitioner profile: SELECT * FROM user_profiles WHERE id = auth.uid()
// - Fetch referral stats: SELECT * FROM practitioner_referrals WHERE practitioner_id = auth.uid()
// - Fetch booking stats: SELECT * FROM bookings WHERE practitioner_id = auth.uid()
// - Pause listing: UPDATE user_profiles SET listing_active = false WHERE id = auth.uid()

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  MapPin,
  Search,
  Stethoscope,
  TrendingUp,
  Users,
  Video,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Component ────────────────────────────────────────────────────────────────

export const PractitionerDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "listing" | "referrals">("overview");
  const [email, setEmail] = useState("");

  useEffect(() => {
    // TODO: fetch practitioner profile from user_profiles where id = auth.uid()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const TABS = [
    { id: "overview" as const, label: "Overview" },
    { id: "listing" as const, label: "My Listing" },
    { id: "referrals" as const, label: "Referrals" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f0ede8" }}>
      {/* Header */}
      <div className="border-b border-black/5" style={{ background: "rgba(240,237,232,0.9)" }}>
        <div className="mx-auto max-w-4xl px-5 py-5">
          <div className="flex items-center gap-2.5">
            <Stethoscope size={20} className="text-[#6B5ED9]" />
            <h1 className="text-lg font-bold text-[#1a1a1a]">Practitioner Portal</h1>
          </div>
          {email && <p className="mt-0.5 text-xs text-[#999]">{email}</p>}
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
        {tab === "overview" && <OverviewTab onEditListing={() => navigate("/practitioner/register")} />}
        {tab === "listing" && <ListingTab onEditListing={() => navigate("/practitioner/register")} />}
        {tab === "referrals" && <ReferralsTab />}
      </div>
    </div>
  );
};

// ─── Tab 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ onEditListing }: { onEditListing: () => void }) {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1a1a1a]">Welcome back, Doctor.</h2>
        <p className="mt-1 text-sm text-[#888]">Your listing is active in Find Help.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-[#555]">
            Basic
          </span>
          <button
            onClick={onEditListing}
            className="text-xs font-medium text-[#6B5ED9] hover:underline"
          >
            Edit listing
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Eye} label="Profile views" value="—" />
        <StatCard icon={Users} label="Referrals from Yves" value="—" />
        <StatCard icon={BookOpen} label="Bookings confirmed" value="—" />
        <StatCard icon={TrendingUp} label="Commission earned" value="—" />
      </div>
      <p className="text-center text-xs text-[#bbb]">Stats coming soon</p>

      {/* How Yves refers */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-base font-semibold text-[#1a1a1a]">
          How Yves refers patients to you
        </h3>
        <div className="space-y-4">
          {[
            { emoji: "\uD83D\uDD0D", text: "Patient describes their issue in Find Help" },
            { emoji: "\uD83E\uDD16", text: "Yves analyses severity + matches to your specialty and niche" },
            { emoji: "\uD83D\uDCCB", text: "Your listing appears in their results" },
            { emoji: "\u2705", text: "Patient books \u2192 you get 90% of the session fee" },
          ].map(({ emoji, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0ebff] text-sm">
                {emoji}
              </span>
              <p className="text-sm text-[#555] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: My Listing ────────────────────────────────────────────────────────

function ListingTab({ onEditListing }: { onEditListing: () => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-[#1a1a1a]">
        How your listing appears in Find Help
      </h2>

      {/* Preview card — matches FindHelp PractitionerCard design */}
      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[#1a1a1a]">Your Name</h3>
            <p className="mt-0.5 text-xs font-medium text-[#6B5ED9]">Physiotherapist</p>
            <p className="mt-0.5 text-xs text-[#888]">e.g. Runners &middot; Cyclists</p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-amber-400">&#9733;</span>
            <span className="font-medium text-[#333]">—</span>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#888]">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            Claremont, Cape Town
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            8 yrs exp
          </span>
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs font-medium text-[#555]">
            R600–R900 / visit
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="mr-1">&#10003;</span>
            Medical Aid
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
            <span className="mr-1">&#128249;</span>
            Telehealth
          </span>
        </div>

        {/* Bio */}
        <p className="mt-3 text-xs leading-relaxed text-[#888]">
          I'm a physiotherapist with 8 years of experience working with endurance
          athletes. I specialise in running injuries and post-surgical
          rehabilitation. My approach combines manual therapy with...
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
        <p className="mt-2 text-center text-[10px] text-[#ccc]">Preview only</p>
      </div>

      <button
        onClick={onEditListing}
        className="flex items-center gap-2 text-sm font-medium text-[#6B5ED9] hover:underline"
      >
        Edit your listing details
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ─── Tab 3: Referrals ─────────────────────────────────────────────────────────

function ReferralsTab() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="mb-4 text-4xl">{"\uD83D\uDCCB"}</span>
      <h2 className="text-lg font-bold text-[#1a1a1a]">
        Referral tracking coming soon
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#888]">
        When Yves routes a patient to you based on your specialty, it will appear
        here. You'll see the referral source, booking status, and commission
        earned per session.
      </p>
      <p className="mt-4 rounded-full bg-[#6B5ED9]/10 px-4 py-1.5 text-xs font-medium text-[#6B5ED9]">
        Phase 2 feature — launching soon
      </p>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
    </div>
  );
}
