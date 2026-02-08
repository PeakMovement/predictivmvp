import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SearchFilters } from '@/hooks/useProviders';

interface ProviderSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  isMobile?: boolean;
}

const specialties = [
  'All Specialties',
  'Internal Medicine',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Psychiatry',
  'Gastroenterology',
  'Dermatology',
  'Pulmonology',
  'Endocrinology',
  'Rheumatology',
  'Ophthalmology',
  'Urology',
  'OB/GYN',
  'ENT',
  'Allergy & Immunology',
  'Emergency Medicine',
  'Family Medicine',
  'Pain Management',
  'Nephrology',
  'Hematology/Oncology',
];

const insuranceOptions = [
  'Blue Cross',
  'Aetna',
  'United',
  'Cigna',
  'Medicare',
  'Medicaid',
  'Kaiser',
  'VSP',
];

export function ProviderSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  isMobile = false,
}: ProviderSearchFiltersProps) {
  const handleClearFilters = () => {
    onFiltersChange({});
    onSearch();
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Specialty</Label>
        <Select
          value={filters.specialty || 'All Specialties'}
          onValueChange={(value) => {
            onFiltersChange({
              ...filters,
              specialty: value === 'All Specialties' ? undefined : value,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select specialty" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map((specialty) => (
              <SelectItem key={specialty} value={specialty}>
                {specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Distance</Label>
        <div className="space-y-2">
          <Slider
            value={[filters.distance || 25]}
            onValueChange={([value]) => onFiltersChange({ ...filters, distance: value })}
            min={5}
            max={50}
            step={5}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Within {filters.distance || 25} miles
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Availability</Label>
        <Select
          value={filters.availability || 'any'}
          onValueChange={(value) => {
            onFiltersChange({
              ...filters,
              availability: value === 'any' ? undefined : value,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="immediate">Today</SelectItem>
            <SelectItem value="same_day">Same Day</SelectItem>
            <SelectItem value="next_day">This Week</SelectItem>
            <SelectItem value="within_week">Next 2 Weeks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="accepting-patients" className="flex-1">
            Accepting New Patients
          </Label>
          <Switch
            id="accepting-patients"
            checked={filters.acceptingNewPatients || false}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, acceptingNewPatients: checked || undefined })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="telehealth" className="flex-1">
            Telehealth Available
          </Label>
          <Switch
            id="telehealth"
            checked={filters.telehealthAvailable || false}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, telehealthAvailable: checked || undefined })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Minimum Rating</Label>
        <Select
          value={filters.minRating?.toString() || 'any'}
          onValueChange={(value) => {
            onFiltersChange({
              ...filters,
              minRating: value === 'any' ? undefined : parseFloat(value),
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any rating</SelectItem>
            <SelectItem value="4.5">4.5+ stars</SelectItem>
            <SelectItem value="4.0">4.0+ stars</SelectItem>
            <SelectItem value="3.5">3.5+ stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleClearFilters} variant="outline" className="w-full">
        Clear All Filters
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by specialty, symptoms, or provider name"
              value={filters.query || ''}
              onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="pl-10"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <Button onClick={onSearch} className="w-full">
          Search Providers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by specialty, symptoms, or provider name"
          value={filters.query || ''}
          onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="pl-10"
        />
      </div>

      <FilterContent />

      <Button onClick={onSearch} className="w-full">
        Search Providers
      </Button>
    </div>
  );
}
