import { useState, useCallback } from 'react';

export interface UserLocation {
  city?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  country?: string;
  formatted?: string;
  latitude?: number;
  longitude?: number;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  isDetecting: boolean;
  error: string | null;
  detectLocation: () => Promise<void>;
  setManualLocation: (location: UserLocation) => void;
  clearLocation: () => void;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = useCallback(async () => {
    setIsDetecting(true);
    setError(null);

    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // Cache for 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;

      // Use reverse geocoding to get location details
      // Using free OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get location details');
      }

      const data = await response.json();
      const address = data.address || {};

      const detectedLocation: UserLocation = {
        city: address.city || address.town || address.village || address.municipality,
        suburb: address.suburb || address.neighbourhood,
        postcode: address.postcode,
        state: address.state,
        country: address.country,
        latitude,
        longitude,
        formatted: [
          address.suburb || address.neighbourhood,
          address.city || address.town || address.village,
          address.state,
          address.postcode,
        ]
          .filter(Boolean)
          .join(', '),
      };

      setLocation(detectedLocation);
    } catch (err) {
      const message = err instanceof GeolocationPositionError
        ? getGeolocationErrorMessage(err)
        : err instanceof Error
          ? err.message
          : 'Failed to detect location';
      setError(message);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const setManualLocation = useCallback((manualLocation: UserLocation) => {
    setLocation(manualLocation);
    setError(null);
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    isDetecting,
    error,
    detectLocation,
    setManualLocation,
    clearLocation,
  };
}

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied. Please enable location access or enter your location manually.';
    case error.POSITION_UNAVAILABLE:
      return 'Location unavailable. Please enter your location manually.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again or enter manually.';
    default:
      return 'Unable to detect location. Please enter manually.';
  }
}
