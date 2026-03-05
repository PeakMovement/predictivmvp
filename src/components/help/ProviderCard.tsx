import { MapPin, Phone, Star, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Provider } from '@/hooks/useProviders';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ProviderCardProps {
  provider: Provider;
  onSelect: (provider: Provider) => void;
  onBook: (provider: Provider) => void;
}

export function ProviderCard({ provider, onSelect, onBook }: ProviderCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDistance = () => {
    const distance = Math.random() * 10 + 0.5;
    return `${distance.toFixed(1)} mi`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {getInitials(provider.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-lg hover:text-primary transition-colors cursor-pointer truncate"
              onClick={() => onSelect(provider)}
            >
              {provider.name}
            </h3>

            <p className="text-sm text-muted-foreground">
              {provider.specialty}
              {provider.sub_specialty && ` • ${provider.sub_specialty}`}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(provider.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
              {provider.review_count !== undefined && provider.review_count > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({provider.review_count} reviews)
                </span>
              )}
            </div>

            {provider.city && provider.state && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {provider.city}, {provider.state} • {formatDistance()}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {provider.accepting_new_patients && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                  Accepting New Patients
                </Badge>
              )}
              {provider.telehealth_available && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  <Video className="h-3 w-3 mr-1" />
                  Telehealth
                </Badge>
              )}
              {provider.availability && provider.availability !== 'within_month' && (
                <Badge variant="outline">
                  {provider.availability === 'immediate' && 'Available Today'}
                  {provider.availability === 'same_day' && 'Same Day'}
                  {provider.availability === 'next_day' && 'Next Day'}
                  {provider.availability === 'within_week' && 'This Week'}
                </Badge>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => onBook(provider)} size="sm" className="flex-1">
                Book Appointment
              </Button>
              <Button
                onClick={() => onSelect(provider)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
