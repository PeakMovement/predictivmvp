import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BookingRequest {
  physicianId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  sessionType?: string;
  notes?: string;
}

// Unified BookingResponse for both native and Calendly bookings
export interface BookingResponse {
  success: boolean;
  bookingId: string;
  source: 'native' | 'calendly';
  status: 'confirmed' | 'pending' | 'cancelled';
  physician: {
    id: string;
    name: string;
    specialty: string;
    phone?: string;
    email?: string;
    location?: string;
  };
  appointment: {
    date: string;
    time: string;
    dateTime?: string;
    startTime?: string;
    endTime?: string;
    sessionType?: string;
  };
  userId?: string;
  createdAt?: string;
  calendlyEventId?: string;
  message?: string;
}

export interface UserBooking {
  id: string;
  sessionDate: string;
  sessionType: string;
  status: string;
  physician: {
    id: string;
    name: string;
    specialty: string;
    phone: string;
    email: string;
    location: string;
    telehealth_available: boolean;
  } | null;
}

interface BookingState {
  isCreating: boolean;
  isFetching: boolean;
  bookings: UserBooking[];
  lastBooking: BookingResponse | null;
  error: string | null;
}

export function useBookings() {
  const [state, setState] = useState<BookingState>({
    isCreating: false,
    isFetching: false,
    bookings: [],
    lastBooking: null,
    error: null,
  });

  const createBooking = useCallback(async (request: BookingRequest): Promise<BookingResponse | null> => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: request
      });

      if (error) {
        throw new Error(error.message || 'Failed to create booking');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Booking creation failed');
      }

      const bookingResponse: BookingResponse = {
        success: true,
        bookingId: data.bookingId,
        source: data.source || 'native',
        status: data.status || 'confirmed',
        physician: data.physician,
        appointment: data.appointment,
        userId: data.userId,
        createdAt: data.createdAt,
      };

      setState(prev => ({ 
        ...prev, 
        isCreating: false, 
        lastBooking: bookingResponse,
        error: null 
      }));

      toast.success('Appointment booked!', {
        description: `${data.physician.name} on ${data.appointment.date} at ${data.appointment.time}`
      });

      return bookingResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create booking';
      setState(prev => ({ ...prev, isCreating: false, error: message }));
      
      // Map specific error codes
      if (message.includes('409') || message.toLowerCase().includes('already booked')) {
        toast.error('Time slot unavailable', { description: 'This time slot is already booked. Please select another time.' });
      } else if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
        toast.error('Authentication required', { description: 'Please sign in to book an appointment.' });
      } else if (message.includes('400') || message.toLowerCase().includes('invalid')) {
        toast.error('Invalid booking details', { description: message });
      } else {
        toast.error('Booking failed', { description: message });
      }
      
      return null;
    }
  }, []);

  const fetchBookings = useCallback(async (options?: { status?: string; upcoming?: boolean }): Promise<UserBooking[]> => {
    setState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const queryParams: Record<string, string> = {};
      if (options?.status) queryParams.status = options.status;
      if (options?.upcoming) queryParams.upcoming = 'true';

      const { data, error } = await supabase.functions.invoke('get-bookings', {
        body: null,
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch bookings');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to retrieve bookings');
      }

      const bookings = data.bookings as UserBooking[];
      setState(prev => ({ ...prev, isFetching: false, bookings, error: null }));
      
      return bookings;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bookings';
      setState(prev => ({ ...prev, isFetching: false, error: message }));
      return [];
    }
  }, []);

  const clearLastBooking = useCallback(() => {
    setState(prev => ({ ...prev, lastBooking: null }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createBooking,
    fetchBookings,
    clearLastBooking,
    clearError,
  };
}
