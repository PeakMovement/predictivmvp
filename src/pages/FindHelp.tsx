import { TriageForm } from "@/components/triage/TriageForm";
import { ProviderMatchForm } from "@/components/help/ProviderMatchForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Search, Stethoscope, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const FindHelp = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Find Help</h1>
          </div>
          <p className="text-muted-foreground">
            Get matched with the right healthcare provider based on your needs, budget, and location.
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="match" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="match" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Find Provider
            </TabsTrigger>
            <TabsTrigger value="triage" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Smart Assessment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match">
            <ProviderMatchForm />
          </TabsContent>

          <TabsContent value="triage">
            <TriageForm />
          </TabsContent>
        </Tabs>

        {/* Emergency Help */}
        <Card className="mt-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground mb-1">Need immediate help?</h3>
                <p className="text-sm text-muted-foreground">
                  If this is an emergency, please call 911 or go to your nearest emergency room.
                </p>
              </div>
              <Button variant="outline" size="sm" className="flex-shrink-0" asChild>
                <a href="tel:911">
                  Call 911
                  <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
