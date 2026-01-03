import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeeklyBriefings, DayBriefing, WeeklyTheme, WeekIntent } from "@/hooks/useWeeklyBriefings";
import { Calendar, Sparkles, Target, Heart, Zap, Scale, RefreshCw, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";

const toneStyles: Record<'coach' | 'warm' | 'strategic', { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  coach: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    text: 'text-primary',
    icon: <Zap className="h-4 w-4" />,
  },
  warm: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: <Heart className="h-4 w-4" />,
  },
  strategic: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    icon: <Scale className="h-4 w-4" />,
  },
};

function DayCard({ day, isToday }: { day: DayBriefing; isToday: boolean }) {
  const tone = day.hasData ? (
    day.category === 'training' ? 'coach' :
    day.category === 'recovery' || day.category === 'wellbeing' ? 'warm' :
    'strategic'
  ) : 'strategic';

  const styles = toneStyles[tone];

  return (
    <Card className={cn(
      "p-4 transition-all duration-200",
      isToday && "ring-2 ring-primary/50",
      day.hasData ? styles.bg : "bg-muted/30"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold",
            isToday ? "text-primary" : "text-foreground"
          )}>
            {day.dayName}
          </span>
          {isToday && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              Today
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {format(new Date(day.date), 'MMM d')}
        </span>
      </div>

      {day.hasData ? (
        <div className="space-y-2">
          {day.todaysFocus && (
            <div className={cn("flex items-start gap-2", styles.text)}>
              {styles.icon}
              <p className="text-sm leading-relaxed">{day.todaysFocus}</p>
            </div>
          )}
          {!day.todaysFocus && day.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {day.summary}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          {new Date(day.date) > new Date() ? "Upcoming" : "No briefing recorded"}
        </p>
      )}
    </Card>
  );
}

function ThemeCard({ theme }: { theme: WeeklyTheme }) {
  const styles = toneStyles[theme.tone];

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-xl border",
      styles.bg,
      styles.border
    )}>
      <div className={cn("mt-0.5", styles.text)}>
        {styles.icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("font-medium", styles.text)}>{theme.label}</span>
          <span className="text-xs text-muted-foreground">
            {theme.days} {theme.days === 1 ? 'day' : 'days'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{theme.description}</p>
      </div>
    </div>
  );
}

function WeeklyFocusBanner({ focus, tone }: { focus: string; tone: 'coach' | 'warm' | 'strategic' }) {
  const styles = toneStyles[tone];

  return (
    <Card className={cn(
      "p-6 border-2",
      styles.bg,
      styles.border
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          styles.bg,
          "border",
          styles.border
        )}>
          <Target className={cn("h-6 w-6", styles.text)} />
        </div>
        <div className="flex-1">
          <h3 className={cn("font-semibold mb-1", styles.text)}>
            Your Week at a Glance
          </h3>
          <p className="text-foreground leading-relaxed">{focus}</p>
        </div>
      </div>
    </Card>
  );
}

function WeekIntentSection({ intent }: { intent: WeekIntent }) {
  const styles = toneStyles[intent.tone];

  return (
    <Card className={cn(
      "p-6 border-2",
      styles.bg,
      styles.border
    )}>
      <div className="space-y-6">
        {/* Intent Statement */}
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            styles.bg,
            "border",
            styles.border
          )}>
            <Shield className={cn("h-6 w-6", styles.text)} />
          </div>
          <div className="flex-1">
            <h3 className={cn("text-sm font-medium mb-1", "text-muted-foreground")}>
              This Week's Intent
            </h3>
            <p className={cn("text-lg font-semibold leading-relaxed", styles.text)}>
              {intent.statement}
            </p>
          </div>
        </div>

        {/* Guardrails */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
          {/* Prioritize */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              "bg-emerald-500/10 border border-emerald-500/30"
            )}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Prioritize
              </span>
              <p className="text-sm text-foreground mt-0.5 leading-relaxed">
                {intent.prioritize}
              </p>
            </div>
          </div>

          {/* Be Careful With */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              "bg-amber-500/10 border border-amber-500/30"
            )}>
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                Be Mindful Of
              </span>
              <p className="text-sm text-foreground mt-0.5 leading-relaxed">
                {intent.beCarefulWith}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function Planner() {
  const { overview, isLoading, error, refresh } = useWeeklyBriefings();

  // Layout customization
  const {
    isEditing: isLayoutEditing,
    editingSections,
    isCustomized: layoutCustomized,
    openEditor: openLayoutEditor,
    closeEditor: closeLayoutEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
  } = useLayoutCustomization('plan');

  const today = format(new Date(), 'yyyy-MM-dd');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Your Weekly Planner</h2>
            <p className="text-muted-foreground">
              As your daily briefings build up, your weekly view will take shape here.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Weekly Planner</h1>
              <p className="text-sm text-muted-foreground">
                {format(overview.weekStart, 'MMM d')} to {format(overview.weekEnd, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Layout Editor */}
        {isLayoutEditing && (
          <div className="mb-8 animate-fade-in">
            <LayoutEditor
              sections={editingSections}
              onSave={saveLayout}
              onCancel={closeLayoutEditor}
              onReset={resetToDefault}
              onToggleVisibility={toggleSectionVisibility}
              onMoveUp={moveSectionUp}
              onMoveDown={moveSectionDown}
              onReorder={reorderSections}
            />
          </div>
        )}

        <div className="space-y-8">
          {/* Week Intent and Guardrails */}
          <LayoutBlock
            blockId="weekIntent"
            displayName="Week Intent"
            pageId="plan"
            size="wide"
            visible={isSectionVisible('weekIntent')}
          >
            <WeekIntentSection intent={overview.intent} />
          </LayoutBlock>

          {/* Overall Focus Banner */}
          <LayoutBlock
            blockId="weeklyFocus"
            displayName="Weekly Focus"
            pageId="plan"
            size="wide"
            visible={isSectionVisible('weeklyFocus')}
          >
            <WeeklyFocusBanner focus={overview.overallFocus} tone={overview.overallTone} />
          </LayoutBlock>

          {/* Weekly Themes */}
          <LayoutBlock
            blockId="themes"
            displayName="Weekly Themes"
            pageId="plan"
            size="wide"
            visible={isSectionVisible('themes') && overview.themes.length > 0}
          >
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Themes This Week
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overview.themes.map((theme, index) => (
                  <ThemeCard key={index} theme={theme} />
                ))}
              </div>
            </section>
          </LayoutBlock>

          {/* Daily Overview */}
          <LayoutBlock
            blockId="dailyBriefings"
            displayName="Daily Briefings"
            pageId="plan"
            size="wide"
            visible={isSectionVisible('dailyBriefings')}
          >
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Day by Day
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {overview.days.map((day) => (
                  <DayCard 
                    key={day.date} 
                    day={day} 
                    isToday={day.date === today}
                  />
                ))}
              </div>
            </section>
          </LayoutBlock>

          {/* Gentle guidance footer */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              This view reflects your existing daily briefings. It grows richer as each day unfolds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
