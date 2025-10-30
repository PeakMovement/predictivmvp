import { useState, useEffect } from "react";
import { User, Calendar, Activity, Target, AlertCircle, HeartPulse, Heart, Coffee, Trophy, Stethoscope, Moon, Brain, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SectionStatus {
  personal: boolean;
  injuries: boolean;
  lifestyle: boolean;
  interests: boolean;
  nutrition: boolean;
  training: boolean;
  medical: boolean;
  wellness: boolean;
  recovery: boolean;
  mindset: boolean;
}

export const ProfileSetup = () => {
  const [currentSection, setCurrentSection] = useState("personal");
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    personal: false,
    injuries: false,
    lifestyle: false,
    interests: false,
    nutrition: false,
    training: false,
    medical: false,
    wellness: false,
    recovery: false,
    mindset: false,
  });

  // Form states
  const [personalData, setPersonalData] = useState({ name: "", dob: "", gender: "", activity_level: "" });
  const [injuriesData, setInjuriesData] = useState({ injuries: "", injury_details: "" });
  const [lifestyleData, setLifestyleData] = useState({ daily_routine: "", work_schedule: "", stress_level: "" });
  const [interestsData, setInterestsData] = useState({ hobbies: "", interests: "" });
  const [nutritionData, setNutritionData] = useState({ diet_type: "", allergies: "", eating_pattern: "" });
  const [trainingData, setTrainingData] = useState({ preferred_activities: "", training_frequency: "", intensity_preference: "" });
  const [medicalData, setMedicalData] = useState({ conditions: "", medications: "", medical_notes: "" });
  const [wellnessData, setWellnessData] = useState({ goals: "", target_date: "", priority: "" });
  const [recoveryData, setRecoveryData] = useState({ sleep_hours: "", sleep_quality: "", recovery_methods: "" });
  const [mindsetData, setMindsetData] = useState({ motivation_factors: "", mental_health_focus: "", stress_management: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all sections
      const [personal, injuries, lifestyle, interests, nutrition, training, medical, wellness, recovery, mindset] = await Promise.all([
        supabase.from('user_profile').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_injuries').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_lifestyle').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_interests').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_nutrition').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_training').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_medical').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_wellness_goals').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_recovery').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_mindset').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (personal.data) {
        setPersonalData(personal.data);
        setSectionStatus(prev => ({ ...prev, personal: true }));
      }
      if (injuries.data) {
        setInjuriesData({ 
          injuries: injuries.data.injuries?.join(', ') || '',
          injury_details: JSON.stringify(injuries.data.injury_details || {})
        });
        setSectionStatus(prev => ({ ...prev, injuries: true }));
      }
      if (lifestyle.data) {
        setLifestyleData(lifestyle.data);
        setSectionStatus(prev => ({ ...prev, lifestyle: true }));
      }
      if (interests.data) {
        setInterestsData({
          hobbies: interests.data.hobbies?.join(', ') || '',
          interests: interests.data.interests?.join(', ') || ''
        });
        setSectionStatus(prev => ({ ...prev, interests: true }));
      }
      if (nutrition.data) {
        setNutritionData({
          ...nutrition.data,
          allergies: nutrition.data.allergies?.join(', ') || ''
        });
        setSectionStatus(prev => ({ ...prev, nutrition: true }));
      }
      if (training.data) {
        setTrainingData({
          ...training.data,
          preferred_activities: training.data.preferred_activities?.join(', ') || ''
        });
        setSectionStatus(prev => ({ ...prev, training: true }));
      }
      if (medical.data) {
        setMedicalData({
          conditions: medical.data.conditions?.join(', ') || '',
          medications: medical.data.medications?.join(', ') || '',
          medical_notes: medical.data.medical_notes || ''
        });
        setSectionStatus(prev => ({ ...prev, medical: true }));
      }
      if (wellness.data) {
        setWellnessData({
          goals: wellness.data.goals?.join(', ') || '',
          target_date: wellness.data.target_date || '',
          priority: wellness.data.priority || ''
        });
        setSectionStatus(prev => ({ ...prev, wellness: true }));
      }
      if (recovery.data) {
        setRecoveryData({
          sleep_hours: recovery.data.sleep_hours?.toString() || '',
          sleep_quality: recovery.data.sleep_quality || '',
          recovery_methods: recovery.data.recovery_methods?.join(', ') || ''
        });
        setSectionStatus(prev => ({ ...prev, recovery: true }));
      }
      if (mindset.data) {
        setMindsetData({
          motivation_factors: mindset.data.motivation_factors?.join(', ') || '',
          mental_health_focus: mindset.data.mental_health_focus || '',
          stress_management: mindset.data.stress_management || ''
        });
        setSectionStatus(prev => ({ ...prev, mindset: true }));
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  };

  const saveSection = async (section: keyof SectionStatus) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      let error = null;

      switch (section) {
        case 'personal':
          ({ error } = await supabase.from('user_profile').upsert({ user_id: user.id, ...personalData }, { onConflict: 'user_id' }));
          break;
        case 'injuries':
          ({ error } = await supabase.from('user_injuries').upsert({
            user_id: user.id,
            injuries: injuriesData.injuries.split(',').map(i => i.trim()).filter(Boolean),
            injury_details: injuriesData.injury_details ? JSON.parse(injuriesData.injury_details) : {}
          }, { onConflict: 'user_id' }));
          break;
        case 'lifestyle':
          ({ error } = await supabase.from('user_lifestyle').upsert({ user_id: user.id, ...lifestyleData }, { onConflict: 'user_id' }));
          break;
        case 'interests':
          ({ error } = await supabase.from('user_interests').upsert({
            user_id: user.id,
            hobbies: interestsData.hobbies.split(',').map(h => h.trim()).filter(Boolean),
            interests: interestsData.interests.split(',').map(i => i.trim()).filter(Boolean)
          }, { onConflict: 'user_id' }));
          break;
        case 'nutrition':
          ({ error } = await supabase.from('user_nutrition').upsert({
            user_id: user.id,
            diet_type: nutritionData.diet_type,
            allergies: nutritionData.allergies.split(',').map(a => a.trim()).filter(Boolean),
            eating_pattern: nutritionData.eating_pattern
          }, { onConflict: 'user_id' }));
          break;
        case 'training':
          ({ error } = await supabase.from('user_training').upsert({
            user_id: user.id,
            preferred_activities: trainingData.preferred_activities.split(',').map(a => a.trim()).filter(Boolean),
            training_frequency: trainingData.training_frequency,
            intensity_preference: trainingData.intensity_preference
          }, { onConflict: 'user_id' }));
          break;
        case 'medical':
          ({ error } = await supabase.from('user_medical').upsert({
            user_id: user.id,
            conditions: medicalData.conditions.split(',').map(c => c.trim()).filter(Boolean),
            medications: medicalData.medications.split(',').map(m => m.trim()).filter(Boolean),
            medical_notes: medicalData.medical_notes
          }, { onConflict: 'user_id' }));
          break;
        case 'wellness':
          ({ error } = await supabase.from('user_wellness_goals').upsert({
            user_id: user.id,
            goals: wellnessData.goals.split(',').map(g => g.trim()).filter(Boolean),
            target_date: wellnessData.target_date || null,
            priority: wellnessData.priority
          }, { onConflict: 'user_id' }));
          break;
        case 'recovery':
          ({ error } = await supabase.from('user_recovery').upsert({
            user_id: user.id,
            sleep_hours: recoveryData.sleep_hours ? parseFloat(recoveryData.sleep_hours) : null,
            sleep_quality: recoveryData.sleep_quality,
            recovery_methods: recoveryData.recovery_methods.split(',').map(r => r.trim()).filter(Boolean)
          }, { onConflict: 'user_id' }));
          break;
        case 'mindset':
          ({ error } = await supabase.from('user_mindset').upsert({
            user_id: user.id,
            motivation_factors: mindsetData.motivation_factors.split(',').map(m => m.trim()).filter(Boolean),
            mental_health_focus: mindsetData.mental_health_focus,
            stress_management: mindsetData.stress_management
          }, { onConflict: 'user_id' }));
          break;
      }

      if (error) throw error;

      setSectionStatus(prev => ({ ...prev, [section]: true }));
      toast.success("✅ Section saved successfully");
      setCurrentSection("");
    } catch (error) {
      toast.error("Failed to save section");
      console.error("Save error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 md:px-6">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glow">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Complete Your Profile
            </CardTitle>
            <CardDescription>Fill out each section to personalize your wellness journey</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible value={currentSection} onValueChange={setCurrentSection}>
              {/* Personal Information */}
              <AccordionItem value="personal" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <span>Personal Information</span>
                    {sectionStatus.personal && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('personal'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={personalData.name} onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input id="dob" type="date" value={personalData.dob} onChange={(e) => setPersonalData({ ...personalData, dob: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={personalData.gender} onValueChange={(value) => setPersonalData({ ...personalData, gender: value })}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity_level">Activity Level</Label>
                      <Select value={personalData.activity_level} onValueChange={(value) => setPersonalData({ ...personalData, activity_level: value })}>
                        <SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low (1-2 days/week)</SelectItem>
                          <SelectItem value="Moderate">Moderate (3-5 days/week)</SelectItem>
                          <SelectItem value="High">High (6-7 days/week)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Injury History */}
              <AccordionItem value="injuries" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <span>Injury History</span>
                    {sectionStatus.injuries && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('injuries'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="injuries">Current or Past Injuries (comma-separated)</Label>
                      <Textarea id="injuries" value={injuriesData.injuries} onChange={(e) => setInjuriesData({ ...injuriesData, injuries: e.target.value })} placeholder="e.g., Knee sprain, Shoulder pain" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="injury_details">Injury Details (optional JSON)</Label>
                      <Textarea id="injury_details" value={injuriesData.injury_details} onChange={(e) => setInjuriesData({ ...injuriesData, injury_details: e.target.value })} placeholder='{"knee": "2023-01"}' />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Lifestyle & Routine */}
              <AccordionItem value="lifestyle" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Coffee className="h-5 w-5 text-primary" />
                    <span>Lifestyle & Routine</span>
                    {sectionStatus.lifestyle && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('lifestyle'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="daily_routine">Daily Routine</Label>
                      <Textarea id="daily_routine" value={lifestyleData.daily_routine} onChange={(e) => setLifestyleData({ ...lifestyleData, daily_routine: e.target.value })} placeholder="Describe your typical day" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work_schedule">Work Schedule</Label>
                      <Input id="work_schedule" value={lifestyleData.work_schedule} onChange={(e) => setLifestyleData({ ...lifestyleData, work_schedule: e.target.value })} placeholder="e.g., 9-5, Night shifts" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stress_level">Stress Level</Label>
                      <Select value={lifestyleData.stress_level} onValueChange={(value) => setLifestyleData({ ...lifestyleData, stress_level: value })}>
                        <SelectTrigger><SelectValue placeholder="Select stress level" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Interests & Hobbies */}
              <AccordionItem value="interests" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-primary" />
                    <span>Interests & Hobbies</span>
                    {sectionStatus.interests && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('interests'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="hobbies">Hobbies (comma-separated)</Label>
                      <Input id="hobbies" value={interestsData.hobbies} onChange={(e) => setInterestsData({ ...interestsData, hobbies: e.target.value })} placeholder="e.g., Reading, Hiking, Cooking" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interests">General Interests (comma-separated)</Label>
                      <Input id="interests" value={interestsData.interests} onChange={(e) => setInterestsData({ ...interestsData, interests: e.target.value })} placeholder="e.g., Technology, Nature, Art" />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Nutrition Habits */}
              <AccordionItem value="nutrition" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <HeartPulse className="h-5 w-5 text-primary" />
                    <span>Nutrition Habits</span>
                    {sectionStatus.nutrition && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('nutrition'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="diet_type">Diet Type</Label>
                      <Input id="diet_type" value={nutritionData.diet_type} onChange={(e) => setNutritionData({ ...nutritionData, diet_type: e.target.value })} placeholder="e.g., Vegetarian, Keto, Balanced" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                      <Input id="allergies" value={nutritionData.allergies} onChange={(e) => setNutritionData({ ...nutritionData, allergies: e.target.value })} placeholder="e.g., Nuts, Dairy, Gluten" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eating_pattern">Eating Pattern</Label>
                      <Input id="eating_pattern" value={nutritionData.eating_pattern} onChange={(e) => setNutritionData({ ...nutritionData, eating_pattern: e.target.value })} placeholder="e.g., 3 meals, Intermittent fasting" />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Training Preferences */}
              <AccordionItem value="training" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <span>Training Preferences</span>
                    {sectionStatus.training && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('training'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="preferred_activities">Preferred Activities (comma-separated)</Label>
                      <Input id="preferred_activities" value={trainingData.preferred_activities} onChange={(e) => setTrainingData({ ...trainingData, preferred_activities: e.target.value })} placeholder="e.g., Running, Cycling, Weightlifting" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="training_frequency">Training Frequency</Label>
                      <Select value={trainingData.training_frequency} onValueChange={(value) => setTrainingData({ ...trainingData, training_frequency: value })}>
                        <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-2 times/week">1-2 times/week</SelectItem>
                          <SelectItem value="3-4 times/week">3-4 times/week</SelectItem>
                          <SelectItem value="5-6 times/week">5-6 times/week</SelectItem>
                          <SelectItem value="Daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intensity_preference">Intensity Preference</Label>
                      <Select value={trainingData.intensity_preference} onValueChange={(value) => setTrainingData({ ...trainingData, intensity_preference: value })}>
                        <SelectTrigger><SelectValue placeholder="Select intensity" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Variable">Variable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Medical Background */}
              <AccordionItem value="medical" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <span>Medical Background</span>
                    {sectionStatus.medical && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('medical'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="conditions">Medical Conditions (comma-separated)</Label>
                      <Textarea id="conditions" value={medicalData.conditions} onChange={(e) => setMedicalData({ ...medicalData, conditions: e.target.value })} placeholder="e.g., Asthma, Diabetes" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medications">Current Medications (comma-separated)</Label>
                      <Textarea id="medications" value={medicalData.medications} onChange={(e) => setMedicalData({ ...medicalData, medications: e.target.value })} placeholder="e.g., Insulin, Aspirin" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medical_notes">Additional Medical Notes</Label>
                      <Textarea id="medical_notes" value={medicalData.medical_notes} onChange={(e) => setMedicalData({ ...medicalData, medical_notes: e.target.value })} placeholder="Any additional medical information" />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Wellness Goals */}
              <AccordionItem value="wellness" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-primary" />
                    <span>Wellness Goals</span>
                    {sectionStatus.wellness && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('wellness'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="goals">Goals (comma-separated)</Label>
                      <Textarea id="goals" value={wellnessData.goals} onChange={(e) => setWellnessData({ ...wellnessData, goals: e.target.value })} placeholder="e.g., Lose weight, Increase flexibility, Reduce stress" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_date">Target Date (optional)</Label>
                      <Input id="target_date" type="date" value={wellnessData.target_date} onChange={(e) => setWellnessData({ ...wellnessData, target_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority Level</Label>
                      <Select value={wellnessData.priority} onValueChange={(value) => setWellnessData({ ...wellnessData, priority: value })}>
                        <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Recovery & Sleep */}
              <AccordionItem value="recovery" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Moon className="h-5 w-5 text-primary" />
                    <span>Recovery & Sleep</span>
                    {sectionStatus.recovery && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('recovery'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="sleep_hours">Average Sleep Hours</Label>
                      <Input id="sleep_hours" type="number" step="0.5" value={recoveryData.sleep_hours} onChange={(e) => setRecoveryData({ ...recoveryData, sleep_hours: e.target.value })} placeholder="e.g., 7.5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sleep_quality">Sleep Quality</Label>
                      <Select value={recoveryData.sleep_quality} onValueChange={(value) => setRecoveryData({ ...recoveryData, sleep_quality: value })}>
                        <SelectTrigger><SelectValue placeholder="Select sleep quality" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Poor">Poor</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recovery_methods">Recovery Methods (comma-separated)</Label>
                      <Input id="recovery_methods" value={recoveryData.recovery_methods} onChange={(e) => setRecoveryData({ ...recoveryData, recovery_methods: e.target.value })} placeholder="e.g., Stretching, Massage, Ice baths" />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>

              {/* Mindset & Motivation */}
              <AccordionItem value="mindset" className="border-glass-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-primary" />
                    <span>Mindset & Motivation</span>
                    {sectionStatus.mindset && <Check className="h-5 w-5 text-green-500 ml-2" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={(e) => { e.preventDefault(); saveSection('mindset'); }} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="motivation_factors">Motivation Factors (comma-separated)</Label>
                      <Textarea id="motivation_factors" value={mindsetData.motivation_factors} onChange={(e) => setMindsetData({ ...mindsetData, motivation_factors: e.target.value })} placeholder="e.g., Health, Appearance, Performance" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mental_health_focus">Mental Health Focus</Label>
                      <Textarea id="mental_health_focus" value={mindsetData.mental_health_focus} onChange={(e) => setMindsetData({ ...mindsetData, mental_health_focus: e.target.value })} placeholder="What mental health aspects are you focusing on?" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stress_management">Stress Management Techniques</Label>
                      <Textarea id="stress_management" value={mindsetData.stress_management} onChange={(e) => setMindsetData({ ...mindsetData, stress_management: e.target.value })} placeholder="e.g., Meditation, Exercise, Journaling" />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Section"}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};