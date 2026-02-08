import { CheckCircle2, Calendar, MapPin, Video, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookingResponse } from '@/hooks/useBookings';
import { useNavigate } from 'react-router-dom';

interface BookingConfirmationModalProps {
  booking: BookingResponse | null;
  open: boolean;
  onClose: () => void;
}

export function BookingConfirmationModal({
  booking,
  open,
  onClose,
}: BookingConfirmationModalProps) {
  const navigate = useNavigate();

  if (!booking) return null;

  const handleAddToCalendar = () => {
    const startDate = new Date(`${booking.appointment.date} ${booking.appointment.time}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Appointment+with+${encodeURIComponent(booking.physician.name)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(`Appointment with ${booking.physician.name}, ${booking.physician.specialty}`)}&location=${encodeURIComponent(booking.physician.location || '')}`;

    window.open(calendarUrl, '_blank');
  };

  const handleViewAppointments = () => {
    onClose();
    navigate('/dashboard');
  };

  const isVirtual = booking.appointment.sessionType?.toLowerCase().includes('telehealth') ||
                    booking.appointment.sessionType?.toLowerCase().includes('virtual');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <DialogTitle className="text-2xl">Appointment Confirmed!</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Your appointment has been successfully booked
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {booking.physician.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{booking.physician.name}</p>
                <p className="text-sm text-muted-foreground">{booking.physician.specialty}</p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{booking.appointment.date}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{booking.appointment.time}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                {isVirtual ? (
                  <>
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span>Telehealth Appointment</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{booking.physician.location || 'In-Person Visit'}</span>
                  </>
                )}
              </div>
            </div>

            {booking.bookingId && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Confirmation #{booking.bookingId.substring(0, 8).toUpperCase()}
                </p>
              </div>
            )}
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Please arrive 10 minutes early</strong> to complete any necessary paperwork.
              {isVirtual && ' You will receive a virtual meeting link 24 hours before your appointment.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={handleAddToCalendar} variant="outline" className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Add to Calendar
          </Button>
          <Button onClick={handleViewAppointments} className="w-full">
            View My Appointments
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full">
            Done
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          A confirmation email has been sent to your email address
        </p>
      </DialogContent>
    </Dialog>
  );
}
