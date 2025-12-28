import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUserLocation, UserLocation } from '@/hooks/useUserLocation';
import { MapPin, Locate, X, Loader2 } from 'lucide-react';

interface LocationInputProps {
  value: UserLocation | null;
  onChange: (location: UserLocation | null) => void;
}

export function LocationInput({ value, onChange }: LocationInputProps) {
  const { isDetecting, error, detectLocation, clearLocation } = useUserLocation();
  const [manualInput, setManualInput] = useState(value?.formatted || '');
  const [showManual, setShowManual] = useState(!value);

  const handleDetect = async () => {
    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        onChange({ formatted: manualInput, city: manualInput });
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Use reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        const city = address.city || address.town || address.village || address.municipality;
        const state = address.state;
        const postcode = address.postcode;
        
        const formatted = [city, state, postcode].filter(Boolean).join(', ');
        
        onChange({
          city,
          state,
          postcode,
          formatted,
          latitude,
          longitude,
        });
        setManualInput(formatted);
        setShowManual(false);
      }
    } catch (err) {
      // Fall back to manual input
      setShowManual(true);
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      // Parse simple location input
      const parts = manualInput.split(',').map(p => p.trim());
      onChange({
        city: parts[0],
        state: parts[1],
        postcode: parts.find(p => /^\d{4,5}$/.test(p)),
        formatted: manualInput.trim(),
      });
      setShowManual(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setManualInput('');
    setShowManual(true);
    clearLocation();
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        Your Location
      </Label>

      {value && !showManual ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm flex-1">{value.formatted || value.city}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="City, suburb, or postcode"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              className="flex-1 bg-background/50"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDetect}
              disabled={isDetecting}
              title="Detect my location"
            >
              {isDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Locate className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {manualInput && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualSubmit}
              className="w-full"
            >
              Use this location
            </Button>
          )}

          {error && (
            <p className="text-xs text-muted-foreground">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
