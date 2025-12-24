import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMedicalFinder } from '@/hooks/useMedicalFinder';
import { BookingModal } from './BookingModal';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clipboard, 
  MessageSquare, 
  Heart, 
  Clock,
  User,
  MapPin,
  Star,
  RotateCcw,
  Download,
  Calendar,
  Phone,
  Mail
} from 'lucide-react';

export function TreatmentPlanStep() {
  const { treatmentPlan, selectedPhysician, startOver, analysis } = useMedicalFinder();
  const [showBookingModal, setShowBookingModal] = useState(false);

  if (!treatmentPlan || !selectedPhysician) return null;

  const handleCall = () => {
    if (selectedPhysician.phone) {
      window.location.href = `tel:${selectedPhysician.phone}`;
    } else {
      toast.error('Phone number not available', { 
        description: 'Contact information is being updated' 
      });
    }
  };

  const handleEmail = () => {
    if (selectedPhysician.email) {
      window.location.href = `mailto:${selectedPhysician.email}`;
    } else {
      toast.error('Email not available', { 
        description: 'Contact information is being updated' 
      });
    }
  };

  const handleCopySummary = () => {
    const summary = `
Medical Finder Summary
=====================
Provider: ${selectedPhysician.name}
Specialty: ${selectedPhysician.specialty}
Location: ${selectedPhysician.city}, ${selectedPhysician.state}
${selectedPhysician.phone ? `Phone: ${selectedPhysician.phone}` : ''}
${selectedPhysician.email ? `Email: ${selectedPhysician.email}` : ''}

${treatmentPlan.summary}

Immediate Steps:
${treatmentPlan.immediateSteps.map(s => `• ${s}`).join('\n')}

Before Appointment:
${treatmentPlan.beforeAppointment.map(s => `• ${s}`).join('\n')}

Questions to Ask:
${treatmentPlan.questionsForDoctor.map(s => `• ${s}`).join('\n')}

Warning Signs:
${treatmentPlan.warningSignsToWatch.map(s => `• ${s}`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard');
  };

  const sections = [
    {
      title: 'Immediate Steps',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      items: treatmentPlan.immediateSteps,
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      title: 'Before Your Appointment',
      icon: <Clipboard className="h-5 w-5 text-primary" />,
      items: treatmentPlan.beforeAppointment,
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20'
    },
    {
      title: 'Questions for Your Doctor',
      icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
      items: treatmentPlan.questionsForDoctor,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      title: 'Lifestyle Recommendations',
      icon: <Heart className="h-5 w-5 text-pink-500" />,
      items: treatmentPlan.lifestyleRecommendations,
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20'
    },
    {
      title: 'Warning Signs to Watch',
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      items: treatmentPlan.warningSignsToWatch,
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Selected Provider Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{selectedPhysician.name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedPhysician.specialty} · {selectedPhysician.location}
              </p>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  {selectedPhysician.rating}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {selectedPhysician.city}, {selectedPhysician.state}
                </span>
              </div>
            </div>
          </div>
          
          {/* Provider Action Buttons */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-primary/20">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => setShowBookingModal(true)}
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Book Appointment
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCall}
              disabled={!selectedPhysician.phone}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleEmail}
              disabled={!selectedPhysician.email}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your Preparation Guide</CardTitle>
          <CardDescription>{treatmentPlan.summary}</CardDescription>
        </CardHeader>
        {treatmentPlan.estimatedRecovery && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/30">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>Estimated Timeline:</strong> {treatmentPlan.estimatedRecovery}
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Plan Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <Card 
            key={index} 
            className={`border-border/50 ${section.bgColor} backdrop-blur-sm`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {section.icon}
                <CardTitle className="text-base">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          <strong>Important:</strong> This guide is for informational purposes only and does not 
          constitute medical advice. Always follow your healthcare provider's recommendations and 
          seek immediate medical attention if symptoms worsen.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={startOver}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Start New Search
        </Button>
        <Button 
          className="flex-1"
          onClick={handleCopySummary}
        >
          <Download className="h-4 w-4 mr-2" />
          Copy Summary
        </Button>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={showBookingModal}
        onOpenChange={setShowBookingModal}
        physician={{
          ...selectedPhysician,
          availability: selectedPhysician.availabilitySchedule
        } as any}
        onBookingComplete={() => setShowBookingModal(false)}
      />
    </div>
  );
}
