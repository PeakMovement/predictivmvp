import { HealthcarePractitioner } from '@/types/treatmentPlans';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Star, Video, Award, Calendar } from 'lucide-react';

interface PractitionerCardProps {
  practitioner: HealthcarePractitioner;
  onBook?: () => void;
  onViewProfile?: () => void;
}

export function PractitionerCard({ practitioner, onBook, onViewProfile }: PractitionerCardProps) {
  const initials = practitioner.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={practitioner.profileImageUrl} alt={practitioner.fullName} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight">{practitioner.fullName}</h3>
            <p className="text-sm text-muted-foreground">{practitioner.title}</p>
            <p className="text-sm font-medium text-primary">{practitioner.specialty}</p>
          </div>
          {practitioner.onlineAvailable && (
            <Badge variant="secondary" className="gap-1">
              <Video className="h-3 w-3" />
              Online
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{practitioner.rating}</span>
          </div>
          {practitioner.yearsExperience && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>{practitioner.yearsExperience} years</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-1">{practitioner.location}</span>
        </div>

        {practitioner.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {practitioner.bio}
          </p>
        )}

        {practitioner.qualifications && practitioner.qualifications.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {practitioner.qualifications.slice(0, 3).map((qual, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {qual}
              </Badge>
            ))}
          </div>
        )}

        <div className="pt-2 space-y-2">
          {practitioner.consultationFee && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Consultation Fee</span>
              <span className="font-semibold">R {practitioner.consultationFee}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={onViewProfile}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              View Profile
            </Button>
            <Button
              onClick={onBook}
              size="sm"
              className="flex-1 gap-1"
            >
              <Calendar className="h-4 w-4" />
              Book
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
