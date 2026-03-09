import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Trash2, Loader2, UserCheck, Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AccessRecord {
  id: string;
  practitioner_email: string;
  practitioner_name: string | null;
  practitioner_type: string | null;
  access_granted_at: string;
  practitioner_id: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  physio: "Physiotherapist",
  coach: "Coach",
  doctor: "Doctor",
  trainer: "Trainer",
  other: "Practitioner",
};

export const PractitionerAccessSettings = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<AccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("physio");

  const fetchRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("practitioner_access")
      .select("id, practitioner_email, practitioner_name, practitioner_type, access_granted_at, practitioner_id")
      .eq("patient_id", user.id)
      .eq("is_active", true)
      .order("access_granted_at", { ascending: false });

    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke("send-practitioner-invite", {
        body: {
          practitioner_email: email.trim(),
          practitioner_name: name.trim() || null,
          practitioner_type: type,
        },
      });

      if (resp.error || resp.data?.error) {
        throw new Error(resp.data?.error || resp.error?.message || "Failed to grant access");
      }

      toast({ title: "Access granted", description: resp.data.message });
      setEmail("");
      setName("");
      setType("physio");
      fetchRecords();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from("practitioner_access")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Access revoked" });
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <Stethoscope className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Share with Practitioner</h3>
          <p className="text-xs text-muted-foreground">
            Give your physio, coach, or doctor read-only access to your health data.
          </p>
        </div>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pract-email">Practitioner's email</Label>
            <Input
              id="pract-email"
              type="email"
              placeholder="physio@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pract-name">Their name (optional)</Label>
            <Input
              id="pract-name"
              type="text"
              placeholder="Dr. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pract-type">Practitioner type</Label>
          <Select value={type} onValueChange={setType} disabled={submitting}>
            <SelectTrigger id="pract-type">
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

        <Button type="submit" disabled={submitting || !email.trim()} className="w-full sm:w-auto">
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending invite…</>
          ) : (
            <><Send className="h-4 w-4 mr-2" />Grant Access</>
          )}
        </Button>
      </form>

      {/* Active access list */}
      {!loading && records.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">People with access</p>
          <div className="space-y-2">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    {rec.practitioner_id ? (
                      <UserCheck className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Send className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {rec.practitioner_name || rec.practitioner_email}
                    </p>
                    {rec.practitioner_name && (
                      <p className="text-xs text-muted-foreground truncate">{rec.practitioner_email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs py-0">
                        {TYPE_LABELS[rec.practitioner_type || "other"] || "Practitioner"}
                      </Badge>
                      {rec.practitioner_id ? (
                        <span className="text-xs text-green-600 font-medium">Active</span>
                      ) : (
                        <span className="text-xs text-amber-500 font-medium">Invite pending</span>
                      )}
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke access?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {rec.practitioner_name || rec.practitioner_email} will no longer be able to view your health data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRevoke(rec.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Revoke access
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && records.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No practitioners have access yet. Use the form above to share your data.
        </p>
      )}
    </div>
  );
};
