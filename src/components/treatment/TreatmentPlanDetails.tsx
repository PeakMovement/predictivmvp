import { TreatmentPlan } from '@/types/treatmentPlans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Banknote, TrendingUp } from 'lucide-react';

interface TreatmentPlanDetailsProps {
  plan: TreatmentPlan;
  onBack?: () => void;
  onConfirm?: () => void;
}

export function TreatmentPlanDetails({ plan, onBack, onConfirm }: TreatmentPlanDetailsProps) {
  return (
    <div className="space-y-6">
      {onBack && (
        <Button onClick={onBack} variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Button>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
              <CardDescription className="text-base">{plan.description}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {plan.planType.replace('-', ' ')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Investment</div>
                <div className="text-xl font-bold">R {plan.totalCost.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="text-lg font-semibold">{plan.timeFrame}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Match Score</div>
                <div className="text-lg font-semibold">
                  {plan.matchScore ? Math.round(plan.matchScore * 100) : 85}%
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Treatment Services</h3>
            <div className="space-y-4">
              {plan.services.map((service, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold capitalize">
                            {service.type.replace('-', ' ')}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                        {service.frequency && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{service.frequency}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">R {service.price}</div>
                        <div className="text-sm text-muted-foreground">per session</div>
                        <div className="text-sm font-medium mt-1">{service.sessions}x sessions</div>
                        <div className="text-sm font-semibold text-primary mt-1">
                          R {service.price * service.sessions}
                        </div>
                      </div>
                    </div>
                    {service.rationale && (
                      <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                        <span className="font-medium">Why this service: </span>
                        {service.rationale}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {plan.expectedOutcomes && plan.expectedOutcomes.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Expected Outcomes</h3>
                <div className="grid gap-3">
                  {plan.expectedOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">{outcome.milestone}</div>
                        <div className="text-sm text-muted-foreground">{outcome.description}</div>
                        <div className="text-xs text-primary mt-1">{outcome.timeframe}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {plan.analyzedSymptoms && plan.analyzedSymptoms.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Addresses Your Concerns</h3>
                <div className="flex flex-wrap gap-2">
                  {plan.analyzedSymptoms.map((symptom, index) => (
                    <Badge key={index} variant="secondary" className="capitalize">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {onConfirm && (
            <Button onClick={onConfirm} size="lg" className="w-full">
              Confirm & Find Practitioners
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
