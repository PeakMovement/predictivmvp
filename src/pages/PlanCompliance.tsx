import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface PlanAdherence {
  date: string;
  plan_type: string;
  adherence_score: number;
  deviation_reasons: string[];
  expected_data: any;
  actual_data: any;
}

export default function PlanCompliance() {
  const [adherenceData, setAdherenceData] = useState<PlanAdherence[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyAverage, setWeeklyAverage] = useState(0);

  useEffect(() => {
    fetchAdherenceData();
  }, []);

  const fetchAdherenceData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch last 7 days of adherence data
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('plan_adherence')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: false });

      if (error) throw error;

      setAdherenceData(data || []);

      // Calculate weekly average
      if (data && data.length > 0) {
        const avg = data.reduce((sum, item) => sum + (item.adherence_score || 0), 0) / data.length;
        setWeeklyAverage(avg * 100);
      }
    } catch (error) {
      console.error('Error fetching adherence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAdherenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 dark:text-green-400';
    if (score >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAdherenceIcon = (score: number) => {
    if (score >= 0.9) return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
    if (score >= 0.7) return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
  };

  const groupedByDate = adherenceData.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, PlanAdherence[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <p>Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Plan Compliance
          </h1>
          <p className="text-muted-foreground">Track your adherence to nutrition and training plans</p>
        </div>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Adherence
            </CardTitle>
            <CardDescription>Last 7 days average</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{weeklyAverage.toFixed(0)}%</span>
                <Badge variant={weeklyAverage >= 90 ? "default" : weeklyAverage >= 70 ? "secondary" : "destructive"}>
                  {weeklyAverage >= 90 ? "Excellent" : weeklyAverage >= 70 ? "Good" : "Needs Work"}
                </Badge>
              </div>
              <Progress value={weeklyAverage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Daily Breakdown */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Daily Breakdown</h2>
          
          {adherenceData.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No compliance data yet. Upload your training and nutrition plans to start tracking.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedByDate).map(([date, items]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAdherenceIcon(item.adherence_score)}
                          <span className="font-medium capitalize">{item.plan_type}</span>
                        </div>
                        <span className={`font-bold ${getAdherenceColor(item.adherence_score)}`}>
                          {(item.adherence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      {item.deviation_reasons && item.deviation_reasons.length > 0 && (
                        <div className="ml-7 space-y-1">
                          {item.deviation_reasons.map((reason, ridx) => (
                            <p key={ridx} className="text-sm text-muted-foreground">• {reason}</p>
                          ))}
                        </div>
                      )}

                      {idx < items.length - 1 && <div className="border-t my-2" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
