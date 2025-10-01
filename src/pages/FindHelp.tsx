import { useState, useEffect } from "react";
import { Search, MapPin, DollarSign, User, Star, Phone, Mail, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Professional {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  location: string;
  budget: string;
  image: string;
  description: string;
}

const professionals: Professional[] = [
  {
    id: 1,
    name: "Dr. Sarah Mitchell",
    specialty: "Physiotherapist",
    rating: 4.8,
    experience: "12 years",
    location: "Johannesburg",
    budget: "medium",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    description: "Specializes in sports injury rehabilitation and chronic pain management"
  },
  {
    id: 2,
    name: "Mark Thompson",
    specialty: "Biokineticist",
    rating: 4.9,
    experience: "8 years",
    location: "Cape Town",
    budget: "high",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mark",
    description: "Expert in exercise prescription and functional movement training"
  },
  {
    id: 3,
    name: "Emma Davies",
    specialty: "Dietician",
    rating: 4.7,
    experience: "10 years",
    location: "Pretoria",
    budget: "low",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    description: "Certified sports nutritionist focusing on performance optimization"
  },
  {
    id: 4,
    name: "Dr. James Wilson",
    specialty: "Physiotherapist",
    rating: 4.6,
    experience: "15 years",
    location: "Durban",
    budget: "medium",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    description: "Orthopedic physiotherapy and post-surgical rehabilitation specialist"
  },
  {
    id: 5,
    name: "Lisa Chen",
    specialty: "Biokineticist",
    rating: 4.8,
    experience: "6 years",
    location: "Johannesburg",
    budget: "low",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    description: "Movement screening and injury prevention for athletes"
  },
  {
    id: 6,
    name: "Dr. Michael Brown",
    specialty: "Dietician",
    rating: 4.9,
    experience: "14 years",
    location: "Cape Town",
    budget: "high",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    description: "Sports nutrition and body composition expert for elite athletes"
  }
];

export const FindHelp = () => {
  const [problem, setProblem] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSearch = () => {
    let results = [...professionals];

    // Filter by budget
    if (budget) {
      results = results.filter(prof => prof.budget === budget);
    }

    // Filter by location
    if (location) {
      results = results.filter(prof => 
        prof.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // If no filters, show all
    if (!budget && !location) {
      results = professionals;
    }

    setFilteredProfessionals(results);
    setShowResults(true);
  };

  const handleAddBooking = (professional: Professional) => {
    setSelectedProfessional(professional);
    setIsBookingDialogOpen(true);
  };

  const confirmBooking = () => {
    if (selectedProfessional) {
      // Get existing bookings from localStorage
      const existingBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
      
      // Create new booking
      const newBooking = {
        id: Date.now(),
        clinician: selectedProfessional.name,
        service: `${selectedProfessional.specialty} Consultation`,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
        time: "2:00 PM",
        type: "In-Person",
        specialty: selectedProfessional.specialty
      };
      
      // Add to bookings
      const updatedBookings = [...existingBookings, newBooking];
      localStorage.setItem('userBookings', JSON.stringify(updatedBookings));
      
      // Show toast
      toast({
        title: "Booking request saved (demo)",
        description: `Your booking with ${selectedProfessional.name} has been added to Your Plan`,
        duration: 3000,
      });
      
      setIsBookingDialogOpen(false);
      setSelectedProfessional(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 pb-32">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent animate-shimmer">
            Find Professional Help
          </h1>
          <p className="text-muted-foreground">
            Connect with certified professionals to support your health journey
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:shadow-glow transition-all duration-300">
          <div className="space-y-6">
            {/* Problem Input */}
            <div className="space-y-2">
              <Label htmlFor="problem" className="text-sm font-medium text-foreground flex items-center gap-2">
                <Search size={16} className="text-primary" />
                What problem are you experiencing?
              </Label>
              <Input
                id="problem"
                placeholder="e.g., knee pain, weight loss, mobility issues..."
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="bg-glass/30 border-glass-border focus:border-primary h-12 text-base"
              />
            </div>

            {/* Budget Range */}
            <div className="space-y-2">
              <Label htmlFor="budget" className="text-sm font-medium text-foreground flex items-center gap-2">
                <DollarSign size={16} className="text-primary" />
                Budget Range
              </Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="bg-glass/30 border-glass-border focus:border-primary h-12">
                  <SelectValue placeholder="Select your budget" />
                </SelectTrigger>
                <SelectContent className="bg-glass backdrop-blur-xl border-glass-border">
                  <SelectItem value="low">Low (R300-R600)</SelectItem>
                  <SelectItem value="medium">Medium (R600-R1000)</SelectItem>
                  <SelectItem value="high">High (R1000+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., Johannesburg, Cape Town..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-glass/30 border-glass-border focus:border-primary h-12 text-base"
              />
            </div>

            {/* Search Button */}
            <Button 
              onClick={handleSearch}
              className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Search size={20} className="mr-2" />
              Find My Professional
            </Button>
          </div>
        </div>

        {/* Results */}
        {showResults && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">
                Recommended Professionals
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredProfessionals.length} results found
              </span>
            </div>

            {filteredProfessionals.length === 0 ? (
              <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 text-center">
                <p className="text-muted-foreground">
                  No professionals found matching your criteria. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProfessionals.map((professional, index) => (
                  <div
                    key={professional.id}
                    className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:shadow-glow hover:scale-105 hover:-translate-y-1 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 overflow-hidden flex-shrink-0">
                        <img 
                          src={professional.image} 
                          alt={professional.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {professional.name}
                          </h3>
                          <p className="text-sm text-primary font-medium">
                            {professional.specialty}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium text-foreground">
                            {professional.rating}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {professional.experience} experience
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {professional.description}
                        </p>

                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={12} className="text-primary" />
                            {professional.location}
                          </div>
                          <div className={cn(
                            "px-2 py-1 rounded-md text-xs font-medium",
                            professional.budget === "low" && "bg-green-500/20 text-green-400",
                            professional.budget === "medium" && "bg-yellow-500/20 text-yellow-400",
                            professional.budget === "high" && "bg-red-500/20 text-red-400"
                          )}>
                            {professional.budget.charAt(0).toUpperCase() + professional.budget.slice(1)} Budget
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-3">
                          <button 
                            onClick={() => handleAddBooking(professional)}
                            className="flex-1 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <CalendarPlus size={14} />
                            Add Booking
                          </button>
                          <button className="flex-1 px-3 py-2 rounded-lg bg-glass/30 border border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-1">
                            <Phone size={14} />
                            Call
                          </button>
                          <button className="px-3 py-2 rounded-lg bg-glass/30 border border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200 text-sm font-medium">
                            <Mail size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-md bg-glass backdrop-blur-xl border border-glass-border shadow-glass">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Confirm Booking
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add this professional to your upcoming bookings?
            </DialogDescription>
          </DialogHeader>
          
          {selectedProfessional && (
            <div className="mt-4 space-y-4">
              <div className="bg-glass/30 rounded-lg border border-glass-border p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/30 overflow-hidden flex-shrink-0">
                    <img 
                      src={selectedProfessional.image} 
                      alt={selectedProfessional.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{selectedProfessional.name}</h4>
                    <p className="text-sm text-primary">{selectedProfessional.specialty}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-muted-foreground">{selectedProfessional.rating}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{selectedProfessional.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={confirmBooking}
                  className="flex-1 p-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
                >
                  Confirm Booking
                </button>
                <button
                  onClick={() => {
                    setIsBookingDialogOpen(false);
                    setSelectedProfessional(null);
                  }}
                  className="flex-1 p-3 rounded-lg bg-glass/30 border border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
