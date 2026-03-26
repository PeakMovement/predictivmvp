import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { firstName: string; dateOfBirth: string; gender: string };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export function OnboardingAboutYou({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">About You</h2>
        <p className="text-sm text-muted-foreground">The basics so Yves knows who you are</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            placeholder="Your first name"
            value={data.firstName}
            onChange={(e) => onUpdate({ firstName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => onUpdate({ dateOfBirth: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <OnboardingChips
            options={GENDER_OPTIONS}
            value={data.gender}
            onChange={(v) => onUpdate({ gender: v as string })}
            columns={2}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
