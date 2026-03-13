// WIREFRAME — Admin Practitioner Management
// Backend integration points:
// Fetch: SELECT * FROM user_profiles WHERE role = 'practitioner_listed' ORDER BY created_at DESC
// Approve: UPDATE user_profiles SET listing_active = true, status = 'approved' WHERE id = ?
// Reject: UPDATE user_profiles SET listing_active = false, status = 'rejected' WHERE id = ?
// Suspend: UPDATE user_profiles SET listing_active = false, status = 'suspended' WHERE id = ?
// Reinstate: UPDATE user_profiles SET listing_active = true, status = 'active' WHERE id = ?
// Verified upgrade: UPDATE user_profiles SET pricing_tier = 'verified' WHERE id = ?
// New table needed: practitioner_referrals (practitioner_id, patient_id, booked_at, attended, commission_zar)

import { useState } from "react";
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  RotateCcw,
  Stethoscope,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ─── Mock data ────────────────────────────────────────────────────────────────

interface RegistryRow {
  id: string;
  name: string;
  specialty: string;
  city: string;
  tier: "basic" | "verified";
  status: "active" | "pending" | "suspended";
  fee_range: string;
  joined: string;
}

const REGISTRY: RegistryRow[] = [
  { id: "1", name: "Dr Sarah Joubert",     specialty: "Physiotherapist",    city: "Cape Town",    tier: "verified", status: "active",    fee_range: "R800–R1,200",  joined: "1 Mar 2026" },
  { id: "2", name: "Justin Muller",        specialty: "Biokineticist",      city: "Cape Town",    tier: "basic",    status: "active",    fee_range: "R600–R900",    joined: "5 Mar 2026" },
  { id: "3", name: "Priya Govender",       specialty: "Physiotherapist",    city: "Durban",       tier: "basic",    status: "active",    fee_range: "R700–R1,000",  joined: "6 Mar 2026" },
  { id: "4", name: "David van Rensburg",   specialty: "S&C Coach",          city: "Pretoria",     tier: "basic",    status: "active",    fee_range: "R600–R800",    joined: "6 Mar 2026" },
  { id: "5", name: "Anele Dlamini",        specialty: "Sports GP",          city: "Johannesburg", tier: "basic",    status: "pending",   fee_range: "R1,000–R1,500", joined: "8 Mar 2026" },
  { id: "6", name: "Marco Rossouw",        specialty: "Nutritionist",       city: "Stellenbosch", tier: "basic",    status: "pending",   fee_range: "R500–R700",    joined: "9 Mar 2026" },
  { id: "7", name: "Fatima Osman",         specialty: "Sports Psychologist", city: "Cape Town",   tier: "basic",    status: "active",    fee_range: "R900–R1,200",  joined: "10 Mar 2026" },
  { id: "8", name: "Liam Botha",           specialty: "Massage Therapist",  city: "Cape Town",    tier: "basic",    status: "suspended", fee_range: "R450–R600",    joined: "28 Feb 2026" },
];

interface PendingRow {
  id: string;
  name: string;
  specialty: string;
  city: string;
  qualifications: string[];
  registration_body: string;
  registration_number: string;
  bio: string;
  fee_range: string;
}

const PENDING: PendingRow[] = [
  {
    id: "5",
    name: "Anele Dlamini",
    specialty: "Sports GP",
    city: "Johannesburg",
    qualifications: ["MBChB (Wits)", "Diploma Sports Medicine", "HPCSA Registered"],
    registration_body: "HPCSA",
    registration_number: "MP0098321",
    bio: "I have 12 years of experience in sports medicine, working with professional rugby and athletics teams. I focus on injury prevention and return-to-play protocols for elite and recreational athletes.",
    fee_range: "R1,000–R1,500",
  },
  {
    id: "6",
    name: "Marco Rossouw",
    specialty: "Nutritionist",
    city: "Stellenbosch",
    qualifications: ["BSc Dietetics (SU)", "Sports Nutrition Certificate", "ADSA Member"],
    registration_body: "HPCSA",
    registration_number: "DT0045678",
    bio: "Specialising in sports nutrition for endurance athletes. I help runners, cyclists, and triathletes optimise their fuelling strategies for training and race day. Evidence-based approach with a focus on practical, sustainable habits.",
    fee_range: "R500–R700",
  },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:    { label: "Active",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending:   { label: "Pending",   className: "bg-amber-100 text-amber-700 border-amber-200" },
  suspended: { label: "Suspended", className: "bg-red-100 text-red-700 border-red-200" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PractitionerListings() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-5">
      {/* Collapsible header — same pattern as other section headers */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        {expanded ? (
          <ChevronDown size={18} className="text-primary" />
        ) : (
          <ChevronRight size={18} className="text-primary" />
        )}
        <Stethoscope size={18} className="text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Practitioners</h2>
        <Badge variant="secondary" className="ml-2 font-mono text-xs">
          8 registered
        </Badge>
      </button>

      {expanded && (
        <div className="space-y-8">
          {/* ── Stat cards — same pattern as SystemHealthOverview ──────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-glass border-glass-border hover:bg-glass-highlight transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20">
                    <Users size={16} className="text-primary" />
                  </div>
                  <TrendingUp size={14} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-primary">8</p>
                <p className="text-xs text-muted-foreground mt-1">Total Registered</p>
              </CardContent>
            </Card>
            <Card className="bg-glass border-glass-border hover:bg-glass-highlight transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/20">
                    <CheckCircle2 size={16} className="text-green-500" />
                  </div>
                  <TrendingUp size={14} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-500">6</p>
                <p className="text-xs text-muted-foreground mt-1">Listings Active</p>
              </CardContent>
            </Card>
            <Card className="bg-glass border-glass-border hover:bg-glass-highlight transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-yellow-500/20">
                    <Clock size={16} className="text-yellow-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-yellow-500">2</p>
                <p className="text-xs text-muted-foreground mt-1">Pending Approval</p>
              </CardContent>
            </Card>
            <Card className="bg-glass border-glass-border hover:bg-glass-highlight transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/20">
                    <Check size={16} className="text-purple-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-500">1</p>
                <p className="text-xs text-muted-foreground mt-1">Verified Partners</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Practitioner Registry table — same pattern as UserOverviewTable ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope size={18} className="text-primary" />
                Practitioner Registry
                <Badge variant="secondary" className="ml-auto font-mono text-xs">
                  8 practitioners
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[900px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fee Range</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {REGISTRY.map((row) => {
                        const status = STATUS_CONFIG[row.status];
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium text-sm">{row.name}</TableCell>
                            <TableCell className="text-sm">{row.specialty}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.city}</TableCell>
                            <TableCell>
                              {row.tier === "verified" ? (
                                <Badge variant="outline" className="text-xs py-0 bg-purple-100 text-purple-700 border-purple-200">
                                  <Check size={10} className="mr-1" />Verified Partner
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs py-0">Basic</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs py-0", status.className)}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.fee_range}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.joined}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                {row.status === "pending" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => console.log("Review:", row.name)}
                                    >
                                      <Eye size={12} className="mr-1" />Review
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => console.log("Approve:", row.name)}
                                    >
                                      <CheckCircle2 size={12} className="mr-1" />Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => console.log("Reject:", row.name)}
                                    >
                                      <X size={12} className="mr-1" />Reject
                                    </Button>
                                  </>
                                ) : row.status === "suspended" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => console.log("View:", row.name)}
                                    >
                                      <Eye size={12} className="mr-1" />View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => console.log("Reinstate:", row.name)}
                                    >
                                      <RotateCcw size={12} className="mr-1" />Reinstate
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => console.log("View:", row.name)}
                                    >
                                      <Eye size={12} className="mr-1" />View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => console.log("Suspend:", row.name)}
                                    >
                                      <Ban size={12} className="mr-1" />Suspend
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ── Pending Approval queue — same card pattern as PractitionerApprovals ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Pending Approval</h3>
              <Badge className="bg-amber-500 text-white text-xs px-2 py-0">
                2 pending
              </Badge>
            </div>

            {PENDING.map((p) => (
              <div
                key={p.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Card header */}
                <div className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{p.name}</span>
                      <Badge variant="outline" className="text-xs py-0 text-primary border-primary/30">
                        {p.specialty}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin size={12} />{p.city}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="px-5 pb-4 space-y-3 border-t border-border/50 pt-3">
                  {/* Qualifications */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.qualifications.map((q) => (
                      <span
                        key={q}
                        className="px-2 py-0.5 bg-muted/50 border border-border rounded-full text-xs text-muted-foreground"
                      >
                        {q}
                      </span>
                    ))}
                  </div>

                  {/* Registration */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Registration: <span className="font-medium text-foreground">{p.registration_body}</span></span>
                    <span>Number: <span className="font-medium text-foreground">{p.registration_number}</span></span>
                    <span>Fee: <span className="font-medium text-foreground">{p.fee_range}</span></span>
                  </div>

                  {/* Bio snippet */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.bio.length > 120 ? p.bio.slice(0, 120) + "…" : p.bio}
                  </p>

                  {/* Actions — same button styles as PractitionerApprovals */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3"
                      onClick={() => console.log("View full profile:", p.name)}
                    >
                      <Eye size={14} className="mr-1" />View full profile
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => console.log("Approve:", p.name)}
                    >
                      <CheckCircle2 size={14} className="mr-1" />Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => console.log("Reject:", p.name)}
                    >
                      <X size={14} className="mr-1" />Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
