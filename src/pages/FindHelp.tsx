// Find Help — searchable, filterable practitioner directory
// Queries healthcare_practitioners table; extra fields (niche_tags,
// pricing_tier, listing_active, etc.) are stored in available_times JSON.

import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  Video,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Practitioner {
  id: string;
  name: string;
  specialty: string;
  suburb: string;
  city: string;
  province: string;
  years_experience: number | null;
  bio: string;
  qualifications: string[];
  telehealth: boolean;
  in_person: boolean;
  accepts_medical_aid: boolean;
  session_fee_min: number | null;
  session_fee_max: number | null;
  niche_tags: string[];
  pricing_tier: string;
  profile_image_url: string | null;
  rating: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FindHelp() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [suburbFilter, setSuburbFilter] = useState("");
  const [telehealthOnly, setTelehealthOnly] = useState(false);
  const [medicalAidOnly, setMedicalAidOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from("healthcare_practitioners")
          .select("*");

        if (fetchErr) throw fetchErr;

        const mapped: Practitioner[] = (data ?? [])
          .map((row) => {
            const extra =
              row.available_times &&
              typeof row.available_times === "object"
                ? (row.available_times as Record<string, unknown>)
                : {};

            // Only include practitioners with listing_active flag
            const listingActive = extra.listing_active as boolean | undefined;
            const role = extra.role as string | undefined;
            if (listingActive === false) return null;
            if (role && role !== "practitioner") return null;

            return {
              id: row.id,
              name: row.full_name ?? "Practitioner",
              specialty: row.specialty ?? "",
              suburb: (extra.suburb as string) ?? "",
              city: row.city ?? "",
              province: row.province ?? "",
              years_experience: row.years_experience ?? null,
              bio: row.bio ?? "",
              qualifications: Array.isArray(row.qualifications)
                ? row.qualifications
                : [],
              telehealth: row.online_available ?? false,
              in_person: (extra.in_person as boolean) ?? false,
              accepts_medical_aid: row.accepts_medical_aid ?? false,
              session_fee_min:
                (extra.session_fee_min as number) ??
                row.consultation_fee ??
                null,
              session_fee_max: (extra.session_fee_max as number) ?? null,
              niche_tags: Array.isArray(extra.niche_tags)
                ? (extra.niche_tags as string[])
                : [],
              pricing_tier: (extra.pricing_tier as string) ?? "basic",
              profile_image_url: row.profile_image_url ?? null,
              rating: row.rating ?? null,
            } as Practitioner;
          })
          .filter((p): p is Practitioner => p !== null);

        setPractitioners(mapped);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load practitioners",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Unique specialties for dropdown
  const specialties = useMemo(
    () =>
      Array.from(
        new Set(practitioners.map((p) => p.specialty).filter(Boolean)),
      ).sort(),
    [practitioners],
  );

  // Filtered list
  const filtered = useMemo(() => {
    return practitioners.filter((p) => {
      if (specialtyFilter && p.specialty !== specialtyFilter) return false;
      if (telehealthOnly && !p.telehealth) return false;
      if (medicalAidOnly && !p.accepts_medical_aid) return false;
      if (
        suburbFilter &&
        !p.suburb.toLowerCase().includes(suburbFilter.toLowerCase()) &&
        !p.city.toLowerCase().includes(suburbFilter.toLowerCase())
      )
        return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          p.name,
          p.specialty,
          p.bio,
          p.suburb,
          p.city,
          ...p.niche_tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    practitioners,
    search,
    specialtyFilter,
    suburbFilter,
    telehealthOnly,
    medicalAidOnly,
  ]);

  const activeFilterCount = [
    specialtyFilter,
    suburbFilter,
    telehealthOnly,
    medicalAidOnly,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSpecialtyFilter("");
    setSuburbFilter("");
    setTelehealthOnly(false);
    setMedicalAidOnly(false);
    setSearch("");
  };

  const inputCls =
    "w-full rounded-xl border border-border/50 bg-card/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
  const pillCls = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-all ${
      active
        ? "bg-primary text-primary-foreground"
        : "border border-border/50 bg-card/60 text-muted-foreground hover:border-border"
    }`;

  return (
    <div className="container mx-auto px-4 py-6 pb-nav-safe max-w-4xl scrollable-content">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Find Help</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse practitioners matched to your needs by Yves
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          className={`${inputCls} pl-10 pr-10`}
          placeholder="Search by name, specialty, or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter toggle */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border"
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} practitioner{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-6 rounded-xl border border-border/50 bg-card/60 p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Specialty */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Specialty
              </label>
              <select
                className={inputCls}
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
              >
                <option value="">All specialties</option>
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Suburb / city */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Location
              </label>
              <input
                className={inputCls}
                placeholder="Suburb or city…"
                value={suburbFilter}
                onChange={(e) => setSuburbFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setTelehealthOnly(!telehealthOnly)}
              className={pillCls(telehealthOnly)}
            >
              Telehealth available
            </button>
            <button
              onClick={() => setMedicalAidOnly(!medicalAidOnly)}
              className={pillCls(medicalAidOnly)}
            >
              Accepts medical aid
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl bg-card/60 border border-border/30"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Search size={40} className="mb-4 text-muted-foreground/40" />
          <h2 className="text-lg font-bold text-foreground">
            No practitioners match your filters yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Try broadening your search or removing some filters. New
            practitioners are joining regularly.
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Practitioner cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((p) => (
            <PractitionerCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Practitioner Card ───────────────────────────────────────────────────────

function PractitionerCard({ p }: { p: Practitioner }) {
  const bioSnippet =
    p.bio.length > 120 ? p.bio.slice(0, 120) + "\u2026" : p.bio;

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground leading-tight">
            {p.name}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-primary">
            {p.specialty}
          </p>
          {p.niche_tags.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {p.niche_tags.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
        {p.rating && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-amber-400">&#9733;</span>
            <span className="font-medium text-foreground">
              {p.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Location + experience */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {[p.suburb, p.city].filter(Boolean).join(", ") || "South Africa"}
        </span>
        {p.years_experience && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {p.years_experience} yrs exp
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {(p.session_fee_min || p.session_fee_max) && (
          <span className="rounded-full border border-border/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            R{p.session_fee_min ?? "?"}–R{p.session_fee_max ?? "?"} / visit
          </span>
        )}
        {p.accepts_medical_aid && (
          <span className="rounded-full border border-green-500/30 bg-green-500/5 px-2.5 py-0.5 text-xs font-medium text-green-600">
            <CheckCircle2
              size={10}
              className="mr-1 inline-block align-text-top"
            />
            Medical Aid
          </span>
        )}
        {p.telehealth && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/5 px-2.5 py-0.5 text-xs font-medium text-blue-500">
            <Video
              size={10}
              className="mr-1 inline-block align-text-top"
            />
            Telehealth
          </span>
        )}
      </div>

      {/* Bio */}
      {bioSnippet && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {bioSnippet}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          disabled
          className="flex-1 rounded-lg bg-muted/50 py-2 text-center text-sm font-medium text-muted-foreground cursor-not-allowed"
        >
          Book
        </button>
        <button
          disabled
          className="rounded-lg border border-border/50 px-4 py-2 text-center text-sm font-medium text-muted-foreground cursor-not-allowed"
        >
          View profile
        </button>
      </div>
    </div>
  );
}

export default FindHelp;
