import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useBookings, BookingResponse } from '@/hooks/useBookings';
import { PhysicianMatch } from '@/contexts/MedicalFinderContext';
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  User,
  MapPin,
  Video
} from 'lucide-react';
import { format, addDays, isAfter, isBefore, startOfToday } from 'date-fns';

type BookingStep = 'select_date' | 'select_time' | 'confirm_details' | 'success';

interface PhysicianAvailability {
  day: string;
  start: string;
  end: string;
}

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  physician: PhysicianMatch & { 
    phone?: string; 
    email?: string;
    availability?: PhysicianAvailability[];
  };
  onBookingComplete?: (booking: BookingResponse) => void;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

const DAY_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

export function BookingModal({ open, onOpenChange, physician, onBookingComplete }: BookingModalProps) {
  const { createBooking, isCreating, lastBooking, error } = useBookings();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('select_date');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [sessionType, setSessionType] = useState('consultation');

  // Get available days based on physician availability
  const availableDays = useMemo(() => {
    if (!physician.availability || physician.availability.length === 0) {
      // Default to weekdays if no availability specified
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    return physician.availability.map(a => a.day);
  }, [physician.availability]);

  // Check if a date is selectable
  const isDateAvailable = (date: Date): boolean => {
    const today = startOfToday();
    if (isBefore(date, today)) return false;
    if (isAfter(date, addDays(today, 60))) return false; // 60 day limit
    
    const dayName = DAY_MAP[date.getDay()];
    return availableDays.includes(dayName);
  };

  // Get available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    const dayName = DAY_MAP[selectedDate.getDay()];
    const dayAvailability = physician.availability?.find(a => a.day === dayName);
    
    if (!dayAvailability) {
      // Default hours
      return TIME_SLOTS.filter(slot => {
        const hour = parseInt(slot.split(':')[0]);
        return hour >= 9 && hour < 17;
      });
    }

    const startHour = parseInt(dayAvailability.start.split(':')[0]);
    const endHour = parseInt(dayAvailability.end.split(':')[0]);

    return TIME_SLOTS.filter(slot => {
      const hour = parseInt(slot.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
  }, [selectedDate, physician.availability]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset time when date changes
    if (date) {
      setCurrentStep('select_time');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setCurrentStep('confirm_details');
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;

    const result = await createBooking({
      physicianId: physician.id,
      appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
      appointmentTime: selectedTime,
      sessionType,
      notes: notes.trim() || undefined,
    });

    if (result) {
      setCurrentStep('success');
      onBookingComplete?.(result);
    }
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep('select_date');
    setSelectedDate(undefined);
    setSelectedTime(null);
    setNotes('');
    setSessionType('consultation');
    onOpenChange(false);
  };

  const goBack = () => {
    if (currentStep === 'select_time') {
      setCurrentStep('select_date');
    } else if (currentStep === 'confirm_details') {
      setCurrentStep('select_time');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'select_date':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Select an appointment date</span>
            </div>
            
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => !isDateAvailable(date)}
                className="rounded-md border"
              />
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Available: {availableDays.join(', ')}
            </div>
          </div>
        );

      case 'select_time':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="text-sm text-muted-foreground">
                {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Select a time slot</span>
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
              {availableTimeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTimeSelect(time)}
                  className="text-sm"
                >
                  {time}
                </Button>
              ))}
            </div>

            {availableTimeSlots.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No time slots available for this date
              </div>
            )}
          </div>
        );

      case 'confirm_details':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>

            {/* Appointment Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{physician.name}</p>
                  <p className="text-sm text-muted-foreground">{physician.specialty}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span>{selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span>{selectedTime}</span>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span>{physician.city}, {physician.state}</span>
              </div>

              {physician.telehealthAvailable && (
                <Badge variant="secondary" className="text-xs">
                  <Video className="h-3 w-3 mr-1" />
                  Telehealth Available
                </Badge>
              )}
            </div>

            {/* Session Type */}
            <div className="space-y-2">
              <Label>Session Type</Label>
              <div className="flex gap-2">
                {['consultation', 'follow-up', 'urgent'].map(type => (
                  <Button
                    key={type}
                    variant={sessionType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSessionType(type)}
                    className="capitalize"
                  >
                    {type.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Describe your symptoms or reason for visit..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={handleConfirm}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Booking...
                </>
              ) : (
                <>
                  Confirm Booking
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">Appointment Confirmed!</h3>
              <p className="text-muted-foreground mt-1">
                Your booking has been successfully created
              </p>
            </div>

            {lastBooking && (
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <p className="font-medium">{lastBooking.physician.name}</p>
                <p className="text-sm text-muted-foreground">{lastBooking.physician.specialty}</p>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4" />
                  <span>{lastBooking.appointment.date}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{lastBooking.appointment.time}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Booking ID: {lastBooking.bookingId.slice(0, 8)}...
                </p>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'success' ? 'Booking Complete' : 'Book Appointment'}
          </DialogTitle>
          {currentStep !== 'success' && (
            <DialogDescription>
              Schedule an appointment with {physician.name}
            </DialogDescription>
          )}
        </DialogHeader>

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
