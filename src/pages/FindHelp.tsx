// @ts-nocheck — practitioners / practitioner_bookings not yet in generated types
import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Search,
  Shield,
  Star,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMatchProvider, ProfessionalType, ParsedIntent } from "@/hooks/useMatchProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Practitioner {
  id: string;
  name: string;
  type: ProfessionalType;
  specialty: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  rating: number;
  consultation_fee_zar: number;
  accepts_medical_aid: boolean;
  telehealth_available: boolean;
  years_experience: number;
  bio: string;
  qualifications: string;
  /** Set for practitioners registered via Predictiv (practitioner_bookings logging) */
  dbId?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROFESSIONAL_TYPE_LABELS: Record<ProfessionalType, string> = {
  physiotherapist: "Physiotherapist",
  biokineticist: "Biokineticist",
  sports_doctor: "Sports Doctor",
  general_practitioner: "General Practitioner",
  dietician: "Dietician",
  strength_coach: "Strength Coach",
  run_coach: "Run Coach",
};

const URGENCY_CONFIG = {
  routine: { label: "Routine", color: "text-green-500", bg: "bg-green-500/10" },
  soon: { label: "See someone soon", color: "text-amber-500", bg: "bg-amber-500/10" },
  urgent: { label: "Seek attention within 24 hours", color: "text-orange-500", bg: "bg-orange-500/10" },
  emergency: { label: "Seek emergency care now", color: "text-red-500", bg: "bg-red-500/10" },
};

const EXAMPLES = [
  "My left knee has been aching after runs for 3 weeks. It's about a 5/10 pain.",
  "I've been feeling exhausted all the time and my running pace has dropped a lot.",
  "Shoulder clicking and mild pain when I lift overhead. Started after a heavy session.",
  "I want to lose 8kg before my next race while keeping my energy up.",
  "My Achilles is tight every morning. I'm training for Comrades in Cape Town.",
];

// ─── CSV loader ───────────────────────────────────────────────────────────────

function parseBool(val: string): boolean {
  return val?.toLowerCase() === "true";
}

async function loadPractitioners(): Promise<Practitioner[]> {
  const response = await fetch("/practitioners.csv");
  const text = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        resolve(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            type: r.type as ProfessionalType,
            specialty: r.specialty,
            city: r.city,
            province: r.province,
            phone: r.phone,
            email: r.email,
            rating: parseFloat(r.rating) || 0,
            consultation_fee_zar: parseInt(r.consultation_fee_zar) || 0,
            accepts_medical_aid: parseBool(r.accepts_medical_aid),
            telehealth_available: parseBool(r.telehealth_available),
            years_experience: parseInt(r.years_experience) || 0,
            bio: r.bio || "",
            qualifications: r.qualifications || "",
          }))
        );
      },
      error: reject,
    });
  });
}

// ─── DB practitioners loader ──────────────────────────────────────────────────

async function loadDbPractitioners(): Promise<Practitioner[]> {
  try {
    const { data, error } = await supabase
      .from("practitioners")
      .select("*")
      .eq("profile_status", "approved");

    if (error || !data) return [];

    return data.map((p: any) => ({
      id:                   `db-${p.id}`,
      dbId:                 p.id,
      name:                 p.name,
      type:                 p.type as ProfessionalType,
      specialty:            (p.specialisations as string[])?.join(", ") || "",
      city:                 [p.location_suburb, p.location_city].filter(Boolean).join(", ") || "",
      province:             "",
      phone:                p.phone || "",
      email:                p.contact_email || "",
      rating:               0,
      consultation_fee_zar: p.fee_per_session || 0,
      accepts_medical_aid:  p.accepts_medical_aid ?? false,
      telehealth_available: p.telehealth_available ?? false,
      years_experience:     0,
      bio:                  p.bio || "",
      qualifications:       "",
    }));
  } catch {
    return [];
  }
}

async function logBooking(practitionerDbId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("practitioner_bookings").insert({
      practitioner_id:  practitionerDbId,
      patient_user_id:  user?.id ?? null,
      source:           "find_help",
      status:           "pending",
    });
  } catch {
    // non-fatal
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

function PractitionerCard({
  practitioner,
  onBook,
  onViewProfile,
}: {
  practitioner: Practitioner;
  onBook: () => void;
  onViewProfile: () => void;
}) {
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground text-base leading-tight">{practitioner.name}</h3>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <p className="text-xs text-primary font-medium">
              {PROFESSIONAL_TYPE_LABELS[practitioner.type] ?? practitioner.type}
            </p>
            {practitioner.dbId && (
              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-full text-[10px] font-semibold uppercase tracking-wide">
                Listed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{practitioner.specialty}</p>
        </div>
        <StarRating rating={practitioner.rating} />
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {practitioner.city}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {practitioner.years_experience} yrs exp
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-xs py-0.5">
          R{practitioner.consultation_fee_zar.toLocaleString()} / visit
        </Badge>
        {practitioner.accepts_medical_aid && (
          <Badge variant="outline" className="text-xs py-0.5 text-green-600 border-green-500/30 bg-green-500/5">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Medical Aid
          </Badge>
        )}
        {practitioner.telehealth_available && (
          <Badge variant="outline" className="text-xs py-0.5 text-blue-500 border-blue-500/30 bg-blue-500/5">
            <Video className="h-3 w-3 mr-1" />
            Telehealth
          </Badge>
        )}
      </div>

      {/* Bio */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{practitioner.bio}</p>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Button size="sm" className="flex-1" onClick={onBook}>
          Book
        </Button>
        <Button size="sm" variant="outline" onClick={onViewProfile}>
          Profile
        </Button>
      </div>
    </div>
  );
}

function PractitionerProfileModal({
  practitioner,
  open,
  onClose,
  onBook,
}: {
  practitioner: Practitioner | null;
  open: boolean;
  onClose: () => void;
  onBook: () => void;
}) {
  if (!practitioner) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{practitioner.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary font-medium text-sm">{PROFESSIONAL_TYPE_LABELS[practitioner.type]}</p>
              <p className="text-muted-foreground text-sm">{practitioner.specialty}</p>
            </div>
            <StarRating rating={practitioner.rating} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {practitioner.city}, {practitioner.province}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              {practitioner.years_experience} years experience
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              {practitioner.phone}
            </div>
            <div className="flex items-center gap-2 font-medium">
              R{practitioner.consultation_fee_zar.toLocaleString()} per visit
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {practitioner.accepts_medical_aid && (
              <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/5">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Accepts Medical Aid
              </Badge>
            )}
            {practitioner.telehealth_available && (
              <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/5">
                <Video className="h-3 w-3 mr-1" />
                Telehealth Available
              </Badge>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-1">About</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{practitioner.bio}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-1">Qualifications</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{practitioner.qualifications}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={onBook}>
              Book Appointment
            </Button>
            <Button variant="outline" asChild>
              <a href={`tel:${practitioner.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookingDialog({
  practitioner,
  open,
  onClose,
}: {
  practitioner: Practitioner | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!practitioner) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Book with {practitioner.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Contact {practitioner.name} directly to book your appointment.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <a href={`tel:${practitioner.phone}`}>
                <Phone className="h-4 w-4 mr-1.5" />
                Call
              </a>
            </Button>
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <a href={`mailto:${practitioner.email}?subject=Appointment%20Request`}>
                <Mail className="h-4 w-4 mr-1.5" />
                Email
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Mention Predictiv when booking and describe your concern so they can allocate the right appointment time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Severity bar ─────────────────────────────────────────────────────────────

function SeverityBar({ severity }: { severity: number }) {
  const pct = (severity / 10) * 100;
  const color =
    severity <= 3 ? "bg-green-500" : severity <= 6 ? "bg-amber-500" : "bg-red-500";
  const label =
    severity <= 3 ? "Mild" : severity <= 6 ? "Moderate" : severity <= 8 ? "Significant" : "Serious";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>Assessed severity</span>
        <span className="font-medium text-foreground">
          {label} ({severity}/10)
        </span>
      </div>
      <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Step = "input" | "analyzing" | "results";

export const FindHelp = () => {
  const [step, setStep] = useState<Step>("input");
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [allPractitioners, setAllPractitioners] = useState<Practitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<Practitioner[]>([]);
  const [profilePractitioner, setProfilePractitioner] = useState<Practitioner | null>(null);
  const [bookPractitioner, setBookPractitioner] = useState<Practitioner | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);

  const { matchProvider, isLoading, error } = useMatchProvider();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load CSV + DB practitioners on mount and merge
  useEffect(() => {
    Promise.all([
      loadPractitioners().catch(() => [] as Practitioner[]),
      loadDbPractitioners(),
    ]).then(([csv, db]) => {
      // DB entries take precedence — dedupe by email to avoid double-listing
      const dbEmails = new Set(db.map((p) => p.email.toLowerCase()).filter(Boolean));
      const csvFiltered = csv.filter((p) => !dbEmails.has(p.email.toLowerCase()));
      // DB practitioners appear first
      setAllPractitioners([...db, ...csvFiltered]);
    }).catch((e) => console.error("[FindHelp] Failed to load practitioners:", e));
  }, []);

  // Check for stored query from other parts of the app
  useEffect(() => {
    const stored = sessionStorage.getItem("findHelpQuery");
    if (stored) {
      try {
        const { q } = JSON.parse(stored);
        if (q) {
          setQuery(q);
          handleSubmit(q);
        }
        sessionStorage.removeItem("findHelpQuery");
      } catch (e) {
        console.error("[FindHelp] Failed to parse stored query:", e);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filterPractitioners = (parsedIntent: ParsedIntent, practitioners: Practitioner[]) => {
    const { professionalTypes, budget, location } = parsedIntent;

    let matches = practitioners.filter((p) => professionalTypes.includes(p.type));

    // Location filter: fuzzy city match
    if (location) {
      const locLower = location.toLowerCase();
      const cityMatches = matches.filter((p) =>
        p.city.toLowerCase().includes(locLower) ||
        p.province.toLowerCase().includes(locLower)
      );
      // Only apply location filter if it narrows meaningfully
      if (cityMatches.length >= 2) matches = cityMatches;
    }

    // Budget filter: show all but sort affordable ones first
    if (budget) {
      matches.sort((a, b) => {
        const aAffordable = a.consultation_fee_zar <= budget;
        const bAffordable = b.consultation_fee_zar <= budget;
        if (aAffordable && !bAffordable) return -1;
        if (!aAffordable && bAffordable) return 1;
        return b.rating - a.rating;
      });
    } else {
      matches.sort((a, b) => b.rating - a.rating);
    }

    return matches;
  };

  const handleSubmit = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;

    setStep("analyzing");

    const result = await matchProvider(q);

    if (!result) {
      setStep("input");
      return;
    }

    setIntent(result);
    const filtered = filterPractitioners(result, allPractitioners);
    setFilteredPractitioners(filtered);
    setStep("results");
  };

  const handleReset = () => {
    setStep("input");
    setQuery("");
    setIntent(null);
    setFilteredPractitioners([]);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    textareaRef.current?.focus();
  };

  // ── Step: Input ────────────────────────────────────────────────────────────

  if (step === "input") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
        <div className="container mx-auto px-4 py-10 pb-28 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Find the right professional</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Describe what you're experiencing and we'll match you with the right healthcare professional.
              No jargon needed — write in your own words.
            </p>
          </div>

          {/* Input card */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
            <Textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. My knee has been aching after runs for 3 weeks. It's about a 5/10 pain and I'm in Cape Town."
              className="min-h-[140px] resize-none bg-background/50 border-border/50 text-sm leading-relaxed focus-visible:ring-primary/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={() => handleSubmit()}
              disabled={!query.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analysing...
                </>
              ) : (
                <>
                  Find professionals
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Press Cmd/Ctrl + Enter to submit
            </p>
          </div>

          {/* Examples */}
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-3 text-center uppercase tracking-wide font-medium">
              Try an example
            </p>
            <div className="space-y-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 border border-border/40 rounded-lg px-4 py-2.5 transition-colors"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
            <p>
              Predictiv helps you find appropriate professionals but does not provide medical advice.
              If you are experiencing a medical emergency, call <strong>10177</strong> (ambulance) or go to your nearest emergency room.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Analyzing ────────────────────────────────────────────────────────

  if (step === "analyzing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/10 flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Analysing your description…</p>
            <p className="text-sm text-muted-foreground mt-1">Finding the right professionals for your situation</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Results ──────────────────────────────────────────────────────────

  const urgencyCfg = intent ? URGENCY_CONFIG[intent.urgency] : null;
  const isEmergency = intent?.urgency === "emergency";
  const isUrgent = intent?.urgency === "urgent";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <div className="container mx-auto px-4 py-6 pb-28 max-w-3xl">
        {/* Back button */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          New search
        </button>

        {/* Emergency banner */}
        {isEmergency && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold text-red-500 text-base">Seek emergency care immediately</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Your symptoms may indicate a serious medical situation. Please call emergency services or go to your nearest emergency room now.
                </p>
                <div className="flex gap-3 mt-4 flex-wrap">
                  <Button className="bg-red-500 hover:bg-red-600 text-white" asChild>
                    <a href="tel:10177">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Ambulance (10177)
                    </a>
                  </Button>
                  <Button variant="outline" className="border-red-500/40" asChild>
                    <a href="tel:082911">
                      082 911 (Private)
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Red flag / urgent banner (non-emergency) */}
        {intent?.redFlags && !isEmergency && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                {isUrgent
                  ? "Your symptoms warrant prompt attention — we recommend seeing a professional within 24 hours."
                  : "Some aspects of your description suggest you should see a professional soon rather than waiting."}
              </p>
            </div>
          </div>
        )}

        {/* AI summary card */}
        {intent && (
          <div className="mb-6 bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  What we understood
                </p>
                <p className="text-sm text-foreground leading-relaxed">{intent.summary}</p>
              </div>
              {urgencyCfg && (
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap", urgencyCfg.bg, urgencyCfg.color)}>
                  {urgencyCfg.label}
                </span>
              )}
            </div>

            <SeverityBar severity={intent.severity} />

            <div>
              <p className="text-xs text-muted-foreground mb-2">Recommended professionals</p>
              <div className="flex flex-wrap gap-1.5">
                {intent.professionalTypes.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {PROFESSIONAL_TYPE_LABELS[type]}
                  </Badge>
                ))}
              </div>
            </div>

            {(intent.budget || intent.location) && (
              <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t border-border/30">
                {intent.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {intent.location}
                  </span>
                )}
                {intent.budget && (
                  <span className="flex items-center gap-1">
                    Budget: R{intent.budget.toLocaleString()} per visit
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Practitioners */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {filteredPractitioners.length > 0
              ? `${filteredPractitioners.length} professional${filteredPractitioners.length !== 1 ? "s" : ""} matched`
              : "No exact matches found"}
          </h2>
        </div>

        {filteredPractitioners.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-muted/10 p-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              We couldn't find practitioners in your exact area for this concern.
            </p>
            <p className="text-xs text-muted-foreground">
              Try removing your location or broadening your description.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredPractitioners.map((p) => (
              <PractitionerCard
                key={p.id}
                practitioner={p}
                onBook={() => {
                  setBookPractitioner(p);
                  setBookOpen(true);
                  if (p.dbId) logBooking(p.dbId);
                }}
                onViewProfile={() => {
                  setProfilePractitioner(p);
                  setProfileOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
          <p>
            Professional recommendations are AI-generated and based on your description.
            They are not a substitute for a medical consultation. If in doubt, see a general practitioner first.
          </p>
        </div>
      </div>

      {/* Modals */}
      <PractitionerProfileModal
        practitioner={profilePractitioner}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onBook={() => {
          setProfileOpen(false);
          setBookPractitioner(profilePractitioner);
          setBookOpen(true);
          if (profilePractitioner?.dbId) logBooking(profilePractitioner.dbId);
        }}
      />

      <BookingDialog
        practitioner={bookPractitioner}
        open={bookOpen}
        onClose={() => setBookOpen(false)}
      />
    </div>
  );
};
