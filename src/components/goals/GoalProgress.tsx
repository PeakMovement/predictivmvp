/**
 * Goal Progress Components
 *
 * Visual representations of goal progress including:
 * - Progress rings
 * - Progress bars
 * - Milestone timelines
 * - Completion animations
 *
 * @module GoalProgress
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Target,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Circle,
  Award,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  category: string;
  color?: string;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  value: number;
  completed: boolean;
  date?: Date;
}

/**
 * Progress Ring Component
 *
 * Circular progress indicator for goals
 */
interface ProgressRingProps {
  /** Current progress (0-100) */
  progress: number;
  /** Ring size */
  size?: "sm" | "md" | "lg";
  /** Ring color */
  color?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Center content */
  children?: React.ReactNode;
}

export const ProgressRing = ({
  progress,
  size = "md",
  color = "#3b82f6",
  showPercentage = true,
  children,
}: ProgressRingProps) => {
  const sizes = {
    sm: { radius: 40, stroke: 6, fontSize: "text-lg" },
    md: { radius: 60, stroke: 8, fontSize: "text-2xl" },
    lg: { radius: 80, stroke: 10, fontSize: "text-3xl" },
  };

  const { radius, stroke, fontSize } = sizes[size];
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s ease" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        {children || (showPercentage && (
          <span className={cn("font-bold", fontSize)}>
            {Math.round(progress)}%
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Goal Card Component
 *
 * Displays a goal with progress visualization
 */
interface GoalCardProps {
  goal: Goal;
  onComplete?: (goalId: string) => void;
}

export const GoalCard = ({ goal, onComplete }: GoalCardProps) => {
  const progress = Math.min(100, (goal.current / goal.target) * 100);
  const isComplete = progress >= 100;
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isComplete && !showAnimation) {
      setShowAnimation(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      onComplete?.(goal.id);
    }
  }, [isComplete, showAnimation, goal.id, onComplete]);

  const daysRemaining = Math.ceil(
    (goal.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className={cn(
      "transition-all",
      isComplete && "border-green-500 bg-green-50/50 dark:bg-green-950/20"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Target className="h-5 w-5 text-primary" />
              )}
              {goal.title}
            </CardTitle>
            {goal.description && (
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            )}
          </div>
          <Badge variant={isComplete ? "default" : "secondary"}>
            {goal.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <ProgressRing
            progress={progress}
            size="md"
            color={goal.color || "#3b82f6"}
          />
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold">
              {goal.current}
              <span className="text-sm text-muted-foreground ml-1">/ {goal.target}</span>
            </div>
            <div className="text-sm text-muted-foreground">{goal.unit}</div>
            {!isComplete && daysRemaining > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{daysRemaining} days left</span>
              </div>
            )}
            {isComplete && (
              <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
                <Trophy className="h-4 w-4" />
                <span>Completed!</span>
              </div>
            )}
          </div>
        </div>

        {goal.milestones && goal.milestones.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Milestones</p>
            <div className="space-y-2">
              {goal.milestones.map((milestone) => {
                const milestoneProgress = (milestone.value / goal.target) * 100;
                const isReached = progress >= milestoneProgress;
                return (
                  <div key={milestone.id} className="flex items-center gap-2">
                    {isReached ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm flex-1",
                      isReached ? "line-through text-muted-foreground" : ""
                    )}>
                      {milestone.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {milestone.value} {goal.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Progress value={progress} className="h-2" />
      </CardContent>
    </Card>
  );
};

/**
 * Milestone Timeline Component
 *
 * Displays milestones on a horizontal timeline
 */
interface MilestoneTimelineProps {
  goal: Goal;
}

export const MilestoneTimeline = ({ goal }: MilestoneTimelineProps) => {
  const progress = Math.min(100, (goal.current / goal.target) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{goal.title}</h3>
        <Badge>{Math.round(progress)}%</Badge>
      </div>

      <div className="relative pt-8">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted transform -translate-y-1/2" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-primary transform -translate-y-1/2 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />

        <div className="relative flex justify-between">
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-primary mb-2" />
            <span className="text-xs font-medium">Start</span>
            <span className="text-xs text-muted-foreground">
              {goal.startDate.toLocaleDateString()}
            </span>
          </div>

          {goal.milestones?.map((milestone, index) => {
            const milestoneProgress = (milestone.value / goal.target) * 100;
            const isReached = progress >= milestoneProgress;

            return (
              <div
                key={milestone.id}
                className="flex flex-col items-center"
                style={{ position: "absolute", left: `${milestoneProgress}%` }}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full mb-2 border-2",
                  isReached
                    ? "bg-primary border-primary"
                    : "bg-background border-muted"
                )}>
                  {isReached && (
                    <CheckCircle2 className="w-full h-full text-white" />
                  )}
                </div>
                <span className="text-xs font-medium whitespace-nowrap">
                  {milestone.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {milestone.value} {goal.unit}
                </span>
              </div>
            );
          })}

          <div className="flex flex-col items-center">
            <div className={cn(
              "w-5 h-5 rounded-full mb-2 flex items-center justify-center",
              progress >= 100 ? "bg-green-600" : "bg-muted"
            )}>
              {progress >= 100 && <Trophy className="w-3 h-3 text-white" />}
            </div>
            <span className="text-xs font-medium">Goal</span>
            <span className="text-xs text-muted-foreground">
              {goal.target} {goal.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Goal History Component
 *
 * Displays completed goals and success rate
 */
interface GoalHistoryProps {
  goals: Goal[];
}

export const GoalHistory = ({ goals }: GoalHistoryProps) => {
  const completedGoals = goals.filter(g => (g.current / g.target) >= 1);
  const successRate = goals.length > 0
    ? (completedGoals.length / goals.length) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Goal History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Goals</p>
            <p className="text-2xl font-bold">{goals.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{completedGoals.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p className="text-2xl font-bold">{Math.round(successRate)}%</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Recent Completions</p>
          {completedGoals.slice(0, 5).map((goal) => (
            <div
              key={goal.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">{goal.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {goal.current} {goal.unit}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{goal.category}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
