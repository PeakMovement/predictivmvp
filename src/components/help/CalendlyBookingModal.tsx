import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Provider } from '@/hooks/useProviders';
import { CalendlyEmbed } from './CalendlyEmbed';

interface CalendlyBookingModalProps {
  provider: Provider | null;
  open: boolean;
  onClose: () => void;
}

export function CalendlyBookingModal({
  provider,
  open,
  onClose,
}: CalendlyBookingModalProps) {
  if (!provider || !provider.calendly_url) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Book Appointment with {provider.name}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <CalendlyEmbed
            calendlyUrl={provider.calendly_url}
            providerName={provider.name}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
