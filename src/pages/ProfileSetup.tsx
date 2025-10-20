import { useState } from "react";
import { User, Calendar, Activity, Target, AlertCircle, HeartPulse } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const USER_ID = "675cf687-785f-447b-b4da-42a8437bb69c";
const ENDPOINT = "https://ixtwbkikyuexskdgfpfq.functions.supabase.co/save-profile";

export const ProfileSetup = () => {
  const [isEditing, setIsEditing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    activity_level: "",
    goals: "",
    injuries: "",
    conditions: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          ...formData,
          goals: formData.goals.split(",").map(g => g.trim()).filter(Boolean),
          injuries: formData.injuries.split(",").map(i => i.trim()).filter(Boolean),
          conditions: formData.conditions.split(",").map(c => c.trim()).filter(Boolean)
        })
      });

      if (!response.ok) throw new Error("Failed to save profile");

      toast.success("✅ Profile saved successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to save profile. Please try again.");
      console.error("Profile save error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="min-h-screen pt-24 pb-32 px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glow">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Your Profile
              </CardTitle>
              <CardDescription>Your profile is up to date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{formData.dob}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium">{formData.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activity Level</p>
                  <p className="font-medium">{formData.activity_level}</p>
                </div>
              </div>
              
              {formData.goals && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Goals</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.goals.split(",").map((goal, idx) => (
                      <span key={idx} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                        {goal.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.injuries && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Injuries</p>
                  <p className="text-sm">{formData.injuries}</p>
                </div>
              )}

              {formData.conditions && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Conditions</p>
                  <p className="text-sm">{formData.conditions}</p>
                </div>
              )}

              <Button onClick={() => setIsEditing(true)} className="w-full">
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 md:px-6">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glow">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Your Profile
            </CardTitle>
            <CardDescription>Complete your profile to personalize your experience</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-background/50 border-glass-border"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dob" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  required
                  className="bg-background/50 border-glass-border"
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Gender
                </Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger className="bg-background/50 border-glass-border">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-glass-border">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Activity Level */}
              <div className="space-y-2">
                <Label htmlFor="activity_level" className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Activity Level
                </Label>
                <Select value={formData.activity_level} onValueChange={(value) => setFormData({ ...formData, activity_level: value })}>
                  <SelectTrigger className="bg-background/50 border-glass-border">
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-glass-border">
                    <SelectItem value="Low">Low (1-2 days/week)</SelectItem>
                    <SelectItem value="Moderate">Moderate (3-5 days/week)</SelectItem>
                    <SelectItem value="High">High (6-7 days/week)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <Label htmlFor="goals" className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Goals (comma-separated)
                </Label>
                <Input
                  id="goals"
                  placeholder="e.g., Weight loss, Build muscle, Improve endurance"
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  className="bg-background/50 border-glass-border"
                />
              </div>

              {/* Injuries */}
              <div className="space-y-2">
                <Label htmlFor="injuries" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Current Injuries (comma-separated)
                </Label>
                <Textarea
                  id="injuries"
                  placeholder="e.g., Left knee pain, Lower back strain"
                  value={formData.injuries}
                  onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
                  className="bg-background/50 border-glass-border min-h-[80px]"
                />
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <Label htmlFor="conditions" className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-primary" />
                  Medical Conditions (comma-separated)
                </Label>
                <Textarea
                  id="conditions"
                  placeholder="e.g., Asthma, Diabetes, High blood pressure"
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  className="bg-background/50 border-glass-border min-h-[80px]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
