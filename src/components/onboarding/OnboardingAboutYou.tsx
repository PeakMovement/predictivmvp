import { Input } from "@/components/ui/input";
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
        <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-coldBlue/40">Profile</p>
        <h2 className="font-display font-light text-3xl text-marble3">About You</h2>
        <p className="font-sans text-sm text-marble1/50 tracking-wide">The basics so Yves knows who you are</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="font-mono text-[9px] tracking-[0.3em] uppercase text-marble1/40">
            First Name <span className="text-critical">*</span>
          </label>
          <Input
            id="firstName"
            placeholder="Your first name"
            value={data.firstName}
            onChange={(e) => onUpdate({ firstName: e.target.value })}
            className="bg-surface border-line text-marble2 placeholder:text-marble1/25 font-sans"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dob" className="font-mono text-[9px] tracking-[0.3em] uppercase text-marble1/40">
            Date of Birth
          </label>
          <Input
            id="dob"
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => onUpdate({ dateOfBirth: e.target.value })}
            className="bg-surface border-line text-marble2 font-sans"
          />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[9px] tracking-[0.3em] uppercase text-marble1/40">Gender</label>
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
