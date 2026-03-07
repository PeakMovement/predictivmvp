import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import { useInjuryProfile, InjuryProfileInput, ClearanceMilestone } from '@/hooks/useInjuryProfile';

const injurySchema = z.object({
  injury_type: z.enum(['muscle_strain', 'ligament_tear', 'fracture', 'surgery', 'spinal', 'tendinopathy', 'other']),
  body_location: z.string().min(2, 'Enter the injury location').max(100),
  injury_date: z.string().min(1, 'Enter the injury date'),
  surgery_date: z.string().optional(),
  treating_practitioner_name: z.string().max(100).optional(),
  treating_practitioner_type: z.enum(['physio', 'surgeon', 'sports_doctor', 'biokineticist', 'other']).optional(),
  load_restrictions: z.string().max(500).optional(),
  target_return_date: z.string().optional(),
  current_phase: z.enum(['acute', 'sub_acute', 'rehabilitation', 'return_to_sport', 'full_clearance']),
  is_active: z.boolean(),
  clearance_milestones: z.array(z.object({
    milestone: z.string().min(1, 'Enter a milestone'),
    achieved: z.boolean(),
  })),
});

type FormData = z.infer<typeof injurySchema>;

const INJURY_TYPE_LABELS: Record<string, string> = {
  muscle_strain: 'Muscle Strain',
  ligament_tear: 'Ligament Tear',
  fracture: 'Fracture',
  surgery: 'Post-Surgery',
  spinal: 'Spinal Injury',
  tendinopathy: 'Tendinopathy',
  other: 'Other',
};

const PRACTITIONER_LABELS: Record<string, string> = {
  physio: 'Physiotherapist',
  surgeon: 'Surgeon',
  sports_doctor: 'Sports Doctor',
  biokineticist: 'Biokineticist',
  other: 'Other',
};

const PHASE_LABELS: Record<string, string> = {
  acute: 'Acute',
  sub_acute: 'Sub-Acute',
  rehabilitation: 'Rehabilitation',
  return_to_sport: 'Return to Sport',
  full_clearance: 'Full Clearance',
};

export const InjuryProfileSettings = () => {
  const { profile, isLoading, isSaving, saveProfile, deactivateProfile } = useInjuryProfile();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(injurySchema),
    defaultValues: {
      injury_type: 'muscle_strain',
      body_location: '',
      injury_date: '',
      surgery_date: '',
      treating_practitioner_name: '',
      treating_practitioner_type: undefined,
      load_restrictions: '',
      target_return_date: '',
      current_phase: 'acute',
      is_active: true,
      clearance_milestones: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'clearance_milestones' });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        injury_type: profile.injury_type,
        body_location: profile.body_location,
        injury_date: profile.injury_date,
        surgery_date: profile.surgery_date ?? '',
        treating_practitioner_name: profile.treating_practitioner_name ?? '',
        treating_practitioner_type: profile.treating_practitioner_type ?? undefined,
        load_restrictions: profile.load_restrictions ?? '',
        target_return_date: profile.target_return_date ?? '',
        current_phase: profile.current_phase,
        is_active: profile.is_active,
        clearance_milestones: profile.clearance_milestones ?? [],
      });
      setShowForm(true);
    }
  }, [profile, reset]);

  const onSubmit = async (data: FormData) => {
    const input: InjuryProfileInput = {
      injury_type: data.injury_type,
      body_location: data.body_location,
      injury_date: data.injury_date,
      surgery_date: data.surgery_date || null,
      treating_practitioner_name: data.treating_practitioner_name || null,
      treating_practitioner_type: data.treating_practitioner_type ?? null,
      load_restrictions: data.load_restrictions || null,
      target_return_date: data.target_return_date || null,
      current_phase: data.current_phase,
      is_active: true,
      clearance_milestones: data.clearance_milestones as ClearanceMilestone[],
    };
    await saveProfile(input);
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="h-5 w-32 bg-muted animate-pulse rounded mb-4" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Injury Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your active injury and return-to-sport timeline. Yves uses this to ensure all
            recommendations respect your load restrictions.
          </p>
        </div>
        {profile && (
          <span className="text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">
            Active injury
          </span>
        )}
      </div>

      {!showForm && !profile && (
        <div className="flex flex-col items-center py-8 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground mb-4">No active injury logged.</p>
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Log an injury
          </Button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Injury type + body location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="injury_type">Injury Type</Label>
              <Select
                value={watch('injury_type')}
                onValueChange={(v) => setValue('injury_type', v as FormData['injury_type'], { shouldDirty: true })}
              >
                <SelectTrigger id="injury_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INJURY_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.injury_type && (
                <p className="text-xs text-destructive">{errors.injury_type.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body_location">Body Location</Label>
              <Input
                id="body_location"
                placeholder="e.g. left hamstring, right knee"
                {...register('body_location')}
              />
              {errors.body_location && (
                <p className="text-xs text-destructive">{errors.body_location.message}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="injury_date">Date of Injury</Label>
              <Input id="injury_date" type="date" {...register('injury_date')} />
              {errors.injury_date && (
                <p className="text-xs text-destructive">{errors.injury_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="surgery_date">Surgery Date (if applicable)</Label>
              <Input id="surgery_date" type="date" {...register('surgery_date')} />
            </div>
          </div>

          {/* Current phase */}
          <div className="space-y-1.5">
            <Label>Current Phase</Label>
            <Select
              value={watch('current_phase')}
              onValueChange={(v) => setValue('current_phase', v as FormData['current_phase'], { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PHASE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target return date */}
          <div className="space-y-1.5">
            <Label htmlFor="target_return_date">Target Return-to-Sport Date</Label>
            <Input id="target_return_date" type="date" {...register('target_return_date')} />
          </div>

          {/* Load restrictions — most safety-critical field */}
          <div className="space-y-1.5">
            <Label htmlFor="load_restrictions">
              Load Restrictions
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (Yves will never recommend activities that violate these)
              </span>
            </Label>
            <Textarea
              id="load_restrictions"
              placeholder="e.g. no running, max HR 140 bpm, no impact loading, upper body only"
              rows={3}
              {...register('load_restrictions')}
            />
            {watch('load_restrictions') && (
              <Alert className="border-amber-500/40 bg-amber-500/8">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs text-muted-foreground">
                  These restrictions are sent to Yves with every AI request.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Treating practitioner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="treating_practitioner_name">Treating Practitioner</Label>
              <Input
                id="treating_practitioner_name"
                placeholder="e.g. Dr. Smith"
                {...register('treating_practitioner_name')}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Practitioner Type</Label>
              <Select
                value={watch('treating_practitioner_type') ?? ''}
                onValueChange={(v) => setValue('treating_practitioner_type', v as FormData['treating_practitioner_type'], { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRACTITIONER_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clearance milestones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Clearance Milestones</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => append({ milestone: '', achieved: false })}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add milestone
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                No milestones added. Add steps your practitioner wants you to achieve before returning to sport.
              </p>
            )}

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={watch(`clearance_milestones.${index}.achieved`)}
                    onCheckedChange={(checked) =>
                      setValue(`clearance_milestones.${index}.achieved`, !!checked, { shouldDirty: true })
                    }
                  />
                  <Input
                    className="flex-1"
                    placeholder="e.g. Walk 30 min pain-free"
                    {...register(`clearance_milestones.${index}.milestone`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSaving || !isDirty}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save profile
              </Button>
              {!profile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              )}
            </div>

            {profile && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                    Mark as resolved
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark injury as resolved?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will deactivate your injury profile. Yves will no longer apply load
                      restrictions. Only do this when your practitioner has given full clearance.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deactivateProfile}>
                      Yes, mark as resolved
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
