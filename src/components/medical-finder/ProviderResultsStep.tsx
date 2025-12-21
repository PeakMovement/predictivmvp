import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMedicalFinder } from '@/hooks/useMedicalFinder';
import { 
  Star, 
  MapPin, 
  Clock, 
  Video, 
  DollarSign, 
  Shield, 
  ChevronRight,
  UserCheck,
  Award,
  ArrowRight
} from 'lucide-react';
import { PhysicianMatch } from '@/contexts/MedicalFinderContext';

export function ProviderResultsStep() {
  const { physicianMatches, generateTreatmentPlan, isLoading, analysis } = useMedicalFinder();

  if (physicianMatches.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
            <UserCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Matches Found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We couldn't find providers matching your exact criteria. Try adjusting your preferences 
            or expanding your search area.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSelectProvider = async (physician: PhysicianMatch) => {
    await generateTreatmentPlan(physician);
  };

  const getCostIndicator = (tier: string) => {
    const tiers: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      premium: 4
    };
    const count = tiers[tier] || 2;
    return (
      <div className="flex">
        {[1, 2, 3, 4].map((i) => (
          <DollarSign 
            key={i} 
            className={`h-3.5 w-3.5 ${i <= count ? 'text-primary' : 'text-muted-foreground/30'}`} 
          />
        ))}
      </div>
    );
  };

  const getAvailabilityText = (availability: string) => {
    const map: Record<string, string> = {
      immediate: 'Available now',
      same_day: 'Same day',
      next_day: 'Next day',
      within_week: 'This week',
      within_month: 'This month'
    };
    return map[availability] || availability;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold">Recommended Providers</h2>
          <p className="text-sm text-muted-foreground">
            {physicianMatches.length} provider{physicianMatches.length !== 1 ? 's' : ''} matched for{' '}
            {analysis?.suggestedSpecialties.slice(0, 2).join(', ')}
          </p>
        </div>
      </div>

      {physicianMatches.map((physician, index) => (
        <Card 
          key={physician.id}
          className={`border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all cursor-pointer ${
            index === 0 ? 'ring-1 ring-primary/30' : ''
          }`}
          onClick={() => handleSelectProvider(physician)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Avatar / Rank */}
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                  index === 0 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index === 0 ? <Award className="h-6 w-6" /> : index + 1}
                </div>
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg">{physician.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {physician.specialty}
                      {physician.subSpecialty && ` · ${physician.subSpecialty}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{physician.rating}</span>
                  </div>
                </div>

                {/* Match Reasons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {physician.matchReasons.slice(0, 3).map((reason, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="text-xs font-normal"
                    >
                      {reason}
                    </Badge>
                  ))}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{physician.city}, {physician.state}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{getAvailabilityText(physician.availability)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    {getCostIndicator(physician.costTier)}
                  </div>
                  {physician.telehealthAvailable && (
                    <div className="flex items-center gap-1.5 text-sm text-primary">
                      <Video className="h-3.5 w-3.5" />
                      <span>Telehealth</span>
                    </div>
                  )}
                </div>

                {/* Insurance */}
                {physician.insuranceAccepted.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <Shield className="h-3 w-3" />
                    <span>Accepts: {physician.insuranceAccepted.slice(0, 3).join(', ')}</span>
                    {physician.insuranceAccepted.length > 3 && 
                      <span>+{physician.insuranceAccepted.length - 3} more</span>
                    }
                  </div>
                )}
              </div>

              {/* Action Arrow */}
              <div className="flex-shrink-0 self-center">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            {/* Match Score Bar */}
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Match Score</span>
                <span className="font-medium">{physician.matchScore}%</span>
              </div>
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${physician.matchScore}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Generating your personalized plan...</span>
          </div>
        </div>
      )}
    </div>
  );
}
