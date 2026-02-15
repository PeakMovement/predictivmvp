import { TreatmentPlan } from '@/types/treatmentPlans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';

interface TreatmentPlanCardProps {
  plan: TreatmentPlan;
  onSelect?: () => void;
  onViewDetails?: () => void;
}

export function TreatmentPlanCard({ plan, onSelect, onViewDetails }: TreatmentPlanCardProps) {
  const planTypeColors = {
    'best-fit': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'high-impact': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'progressive': 'bg-green-500/10 text-green-500 border-green-500/20',
    'budget-conscious': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  };

  const planTypeLabels = {
    'best-fit': 'Best Fit',
    'high-impact': 'High Impact',
    'progressive': 'Progressive',
    'budget-conscious': 'Budget Friendly',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          <Badge className={planTypeColors[plan.planType]}>
            {planTypeLabels[plan.planType]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">R {plan.totalCost.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{plan.timeFrame}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">Included Services:</div>
          <div className="space-y-1">
            {plan.services.map((service, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                <span className="capitalize">{service.type.replace('-', ' ')}</span>
                <span className="text-muted-foreground">({service.sessions}x sessions)</span>
              </div>
            ))}
          </div>
        </div>

        {plan.matchScore && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {Math.round(plan.matchScore * 100)}% match for your needs
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={onViewDetails}
            variant="outline"
            className="flex-1"
          >
            View Details
          </Button>
          <Button
            onClick={onSelect}
            className="flex-1"
          >
            Select Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
