import { useState, useEffect } from "react";
import { format, isAfter, isSunday, getHours } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWeeklyBriefings, WeeklyTheme, WeekIntent } from "@/hooks/useWeeklyBriefings";
import { Calendar, CalendarDays, Sparkles, Target, Heart, Zap, Scale, RefreshCw, Shield, AlertCircle, CheckCircle2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { DailyPlanView } from "@/components/planner/DailyPlanView";
import { ChallengeAcceptanceModal } from "@/components/planner/ChallengeAcceptanceModal";
import { WeeklyReflectionModal } from "@/components/planner/WeeklyReflectionModal";
import { supabase } from "@/integrations/supabase/client";

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

function ThemeCard({ theme, onAcceptChallenge }: { theme: WeeklyTheme; onAcceptChallenge: (theme: WeeklyTheme) => void }) {
  const styles = toneStyles[theme.tone];

  return (
    <div className={cn(
      "flex flex-col gap-3 p-4 rounded-xl border",
      styles.bg,
      styles.border
    )}>
      <div className="flex items-start gap-3">
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
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => onAcceptChallenge(theme)}
      >
        <Trophy className="h-4 w-4" />
        Accept Challenge
      </Button>
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
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedChallenge, setSelectedChallenge] = useState<WeeklyTheme | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);

  // Layout customization
  const {
    isEditing: isLayoutEditing,
    editingSections,
    isCustomized: layoutCustomized,
    previewMode,
    openEditor: openLayoutEditor,
    closeEditor: closeLayoutEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    toggleCollapseByDefault,
    togglePreviewMode,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
  } = useLayoutCustomization('plan');

  // Check if we should show weekly reflection (Sunday evening, after 6pm)
  useEffect(() => {
    const checkReflectionPrompt = async () => {
      const now = new Date();
      const isSundayEvening = isSunday(now) && getHours(now) >= 18;

      if (!isSundayEvening || !overview) return;

      // Check if user has already reflected this week
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingReflection } = await supabase
        .from("weekly_reflections")
        .select("id")
        .eq("user_id", user.id)
        .eq("week_start_date", format(overview.weekStart, "yyyy-MM-dd"))
        .maybeSingle();

      if (!existingReflection) {
        setShowReflectionModal(true);
      }
    };

    checkReflectionPrompt();
  }, [overview]);

  const handleAcceptChallenge = (theme: WeeklyTheme) => {
    setSelectedChallenge(theme);
    setShowChallengeModal(true);
  };

  const handleChallengeAccepted = () => {
    refresh();
  };

  const handleReflectionSubmitted = () => {
    refresh();
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-nav-safe">
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
      <div className="min-h-screen bg-background pb-nav-safe">
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
      <div className="min-h-screen bg-background pb-nav-safe">
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
    <div className="min-h-screen bg-background pb-nav-safe">
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
              previewMode={previewMode}
              onSave={saveLayout}
              onCancel={closeLayoutEditor}
              onReset={resetToDefault}
              onToggleVisibility={toggleSectionVisibility}
              onToggleCollapseByDefault={toggleCollapseByDefault}
              onTogglePreviewMode={togglePreviewMode}
              onMoveUp={moveSectionUp}
              onMoveDown={moveSectionDown}
              onReorder={reorderSections}
            />
          </div>
        )}

        {/* View Tabs */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "week" | "day")} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="day">Day View</TabsTrigger>
          </TabsList>

          {/* Week View */}
          <TabsContent value="week" className="space-y-8 mt-8">
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
                  <ThemeCard key={index} theme={theme} onAcceptChallenge={handleAcceptChallenge} />
                ))}
              </div>
            </section>
          </LayoutBlock>

          {/* Calendar Events */}
          <LayoutBlock
            blockId="calendarEvents"
            displayName="Calendar"
            pageId="plan"
            size="wide"
            visible={isSectionVisible('calendarEvents')}
          >
            <Card className="p-8 border border-border/50">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <CalendarDays className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Your Week Ahead</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Connect your Google Calendar to see your upcoming events, meetings,
                  and schedule right here alongside your weekly plan.
                </p>
                <Button className="gap-2">
                  <CalendarDays className="h-4 w-4" /> Connect Google Calendar
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your events will appear here once connected
                </p>
              </div>
            </Card>
          </LayoutBlock>

          {/* Gentle guidance footer */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              This view reflects your existing daily briefings. It grows richer as each day unfolds.
            </p>
          </div>
          </TabsContent>

          {/* Day View */}
          <TabsContent value="day" className="mt-8">
            <DailyPlanView selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </TabsContent>
        </Tabs>

        {/* Challenge Acceptance Modal */}
        <ChallengeAcceptanceModal
          open={showChallengeModal}
          onOpenChange={setShowChallengeModal}
          challenge={selectedChallenge ? {
            title: selectedChallenge.label,
            description: selectedChallenge.description,
            type: selectedChallenge.label.toLowerCase(),
            tone: selectedChallenge.tone,
          } : null}
          onChallengeAccepted={handleChallengeAccepted}
        />

        {/* Weekly Reflection Modal */}
        {overview && (
          <WeeklyReflectionModal
            open={showReflectionModal}
            onOpenChange={setShowReflectionModal}
            weekStart={overview.weekStart}
            onReflectionSubmitted={handleReflectionSubmitted}
          />
        )}
      </div>
    </div>
  );
}
