import { useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Provider } from '@/hooks/useProviders';
import { useBookings, BookingRequest } from '@/hooks/useBookings';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface BookingModalProps {
  provider: Provider | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const timeSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

export function BookingModal({ provider, open, onClose, onSuccess }: BookingModalProps) {
  const { createBooking, isCreating } = useBookings();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [sessionType, setSessionType] = useState<string>('in-person');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!provider || !selectedDate || !selectedTime) return;

    const booking: BookingRequest = {
      physicianId: provider.id,
      appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
      appointmentTime: selectedTime,
      sessionType,
      notes: notes.trim() || undefined,
    };

    const result = await createBooking(booking);
    if (result) {
      onSuccess();
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    setSessionType('in-person');
    setNotes('');
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!provider) return null;

  const isFormValid = selectedDate && selectedTime;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getInitials(provider.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{provider.name}</p>
              <p className="text-sm text-muted-foreground">{provider.specialty}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
              />
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <Label>Select Time</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className="w-full"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Session Type</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-person">In-Person Visit</SelectItem>
                  {provider.telehealth_available && (
                    <SelectItem value="telehealth">Telehealth (Virtual)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or reasons for your visit..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleClose} variant="outline" className="flex-1" disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={!isFormValid || isCreating}
          >
            {isCreating ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
