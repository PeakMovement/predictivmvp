import { differenceInDays, parseISO, format } from 'date-fns';
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, Activity } from 'lucide-react';
import { InjuryProfile, InjuryPhase, ClearanceMilestone } from '@/hooks/useInjuryProfile';

interface ReturnToSportCardProps {
  profile: InjuryProfile;
}

const PHASES: InjuryPhase[] = [
  'acute',
  'sub_acute',
  'rehabilitation',
  'return_to_sport',
  'full_clearance',
];

const PHASE_LABELS: Record<InjuryPhase, string> = {
  acute: 'Acute',
  sub_acute: 'Sub-Acute',
  rehabilitation: 'Rehabilitation',
  return_to_sport: 'Return to Sport',
  full_clearance: 'Full Clearance',
};

const INJURY_TYPE_LABELS: Record<string, string> = {
  muscle_strain: 'Muscle Strain',
  ligament_tear: 'Ligament Tear',
  fracture: 'Fracture',
  surgery: 'Post-Surgery',
  spinal: 'Spinal Injury',
  tendinopathy: 'Tendinopathy',
  other: 'Injury',
};

export const ReturnToSportCard = ({ profile }: ReturnToSportCardProps) => {
  const currentPhaseIndex = PHASES.indexOf(profile.current_phase);
  const progressPercent = ((currentPhaseIndex) / (PHASES.length - 1)) * 100;

  const injuryDate = parseISO(profile.injury_date);
  const daysSinceInjury = differenceInDays(new Date(), injuryDate);

  const daysUntilReturn = profile.target_return_date
    ? differenceInDays(parseISO(profile.target_return_date), new Date())
    : null;

  const milestones: ClearanceMilestone[] = Array.isArray(profile.clearance_milestones)
    ? profile.clearance_milestones
    : [];
  const nextMilestone = milestones.find((m) => !m.achieved) ?? null;
  const achievedCount = milestones.filter((m) => m.achieved).length;

  const injuryLabel = INJURY_TYPE_LABELS[profile.injury_type] ?? 'Injury';

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-amber-500">
              Return to Sport
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {injuryLabel} — {profile.body_location}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Day {daysSinceInjury} since injury &nbsp;·&nbsp; Injured{' '}
            {format(injuryDate, 'd MMM yyyy')}
          </p>
        </div>
        {profile.treating_practitioner_name && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Under care of</p>
            <p className="text-xs font-medium text-foreground">{profile.treating_practitioner_name}</p>
          </div>
        )}
      </div>

      {/* Phase progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-foreground">
            {PHASE_LABELS[profile.current_phase]}
          </span>
          <span className="text-xs text-muted-foreground">
            Phase {currentPhaseIndex + 1} of {PHASES.length}
          </span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between">
          {PHASES.map((phase, i) => (
            <span
              key={phase}
              className={`text-xs ${
                i <= currentPhaseIndex
                  ? 'text-amber-500 font-medium'
                  : 'text-muted-foreground/50'
              }`}
              style={{ fontSize: '10px' }}
            >
              {PHASE_LABELS[phase].split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Load restrictions — most safety-critical, styled as a warning */}
      {profile.load_restrictions && (
        <div className="flex gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/8 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">
              Load Restrictions
            </p>
            <p className="text-xs text-foreground leading-relaxed">{profile.load_restrictions}</p>
          </div>
        </div>
      )}

      {/* Return date countdown */}
      {daysUntilReturn !== null && (
        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
          {daysUntilReturn > 0 ? (
            <span className="text-foreground">
              <span className="font-semibold">{daysUntilReturn} days</span> until target return
              &nbsp;
              <span className="text-muted-foreground text-xs">
                ({format(parseISO(profile.target_return_date!), 'd MMM yyyy')})
              </span>
            </span>
          ) : daysUntilReturn === 0 ? (
            <span className="text-foreground font-medium">Target return date is today</span>
          ) : (
            <span className="text-muted-foreground">
              Target date passed{' '}
              {format(parseISO(profile.target_return_date!), 'd MMM yyyy')} — check in with your
              practitioner
            </span>
          )}
        </div>
      )}

      {/* Next milestone */}
      {milestones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Milestones &nbsp;
            <span className="normal-case font-normal">
              {achievedCount}/{milestones.length} achieved
            </span>
          </p>
          {nextMilestone ? (
            <div className="flex items-start gap-2.5">
              <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Next milestone</p>
                <p className="text-sm text-foreground">{nextMilestone.milestone}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>All milestones achieved</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
