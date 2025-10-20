import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Activity, Heart, Apple, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HealthProfileViewerProps {
  profile: {
    profile_data: {
      nutrition_summary?: {
        daily_calories?: number;
        macros?: {
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
        };
        meal_timing?: string[];
        supplements?: string[];
      };
      medical_summary?: {
        active_conditions?: string[];
        medications?: any[];
        allergies?: string[];
        contraindications?: string[];
      };
      training_summary?: {
        program_name?: string;
        current_phase?: string;
        weekly_volume_km?: number;
        weekly_schedule?: any[];
        goal_race_date?: string;
      };
    };
    ai_synthesis?: string;
    generated_at: string;
    version: number;
  };
}

export function HealthProfileViewer({ profile }: HealthProfileViewerProps) {
  const { profile_data, ai_synthesis, generated_at, version } = profile;
  const { nutrition_summary, medical_summary, training_summary } = profile_data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Health Intelligence Profile
              </CardTitle>
              <CardDescription>
                Version {version} • Updated {formatDistanceToNow(new Date(generated_at), { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ai_synthesis && (
            <div className="rounded-lg bg-muted p-4 mb-4">
              <p className="text-sm leading-relaxed">{ai_synthesis}</p>
            </div>
          )}
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Nutrition Card */}
            {nutrition_summary && Object.keys(nutrition_summary).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Apple className="h-4 w-4" />
                    Nutrition
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nutrition_summary.daily_calories && (
                    <div>
                      <p className="text-xs text-muted-foreground">Daily Calories</p>
                      <p className="text-lg font-semibold">{nutrition_summary.daily_calories}</p>
                    </div>
                  )}
                  {nutrition_summary.macros && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Macros</p>
                      <div className="flex gap-2 flex-wrap">
                        {nutrition_summary.macros.protein_g && (
                          <Badge variant="secondary">P: {nutrition_summary.macros.protein_g}g</Badge>
                        )}
                        {nutrition_summary.macros.carbs_g && (
                          <Badge variant="secondary">C: {nutrition_summary.macros.carbs_g}g</Badge>
                        )}
                        {nutrition_summary.macros.fat_g && (
                          <Badge variant="secondary">F: {nutrition_summary.macros.fat_g}g</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {nutrition_summary.meal_timing && nutrition_summary.meal_timing.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Meal Times
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {nutrition_summary.meal_timing.map((time, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{time}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Medical Card */}
            {medical_summary && Object.keys(medical_summary).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Medical
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {medical_summary.active_conditions && medical_summary.active_conditions.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Conditions</p>
                      <div className="space-y-1">
                        {medical_summary.active_conditions.map((condition, i) => (
                          <Badge key={i} variant="secondary" className="mr-1">{condition}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {medical_summary.medications && medical_summary.medications.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Medications</p>
                      <div className="space-y-1">
                        {medical_summary.medications.map((med: any, i) => (
                          <p key={i} className="text-xs">{med.name} - {med.dosage}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {medical_summary.allergies && medical_summary.allergies.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Allergies</p>
                      <div className="flex gap-1 flex-wrap">
                        {medical_summary.allergies.map((allergy, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">{allergy}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Training Card */}
            {training_summary && Object.keys(training_summary).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Training
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {training_summary.program_name && (
                    <div>
                      <p className="text-xs text-muted-foreground">Program</p>
                      <p className="text-sm font-medium">{training_summary.program_name}</p>
                    </div>
                  )}
                  {training_summary.current_phase && (
                    <div>
                      <p className="text-xs text-muted-foreground">Phase</p>
                      <Badge className="capitalize">{training_summary.current_phase}</Badge>
                    </div>
                  )}
                  {training_summary.weekly_volume_km && (
                    <div>
                      <p className="text-xs text-muted-foreground">Weekly Volume</p>
                      <p className="text-lg font-semibold">{training_summary.weekly_volume_km} km</p>
                    </div>
                  )}
                  {training_summary.goal_race_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Goal Race</p>
                      <p className="text-sm">{new Date(training_summary.goal_race_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
