import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { KPICard } from '../../components/KPICard';
import { ActivityChart } from '../../components/charts/ActivityChart';
import { TrafficSourcesChart } from '../../components/charts/TrafficSourcesChart';
import { ActivityFeed } from '../../components/ActivityFeed';
import { Button } from '../../components/ui/button';
import { Download, Calendar } from 'lucide-react';
import { AdminApiService } from '../../services/admin/adminApiService';

interface KPIData {
  activeNow: number;
  activeNowChange: number;
  sessionsToday: number;
  sessionsChange: number;
  passRate: number;
  passRateChange: number;
  examsTaken: number;
  examsChange: number;
  avgDuration: number;
  durationChange: number;
  countries: number;
  countriesChange: number;
}

interface TimeSeriesItem {
  time: string;
  activeSessions: number;
  examAttempts: number;
}

interface TrafficSource {
  name: string;
  value: number;
  percentage: number;
  change: number;
  color: string;
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userCountry: string;
  action: string;
  subject: string;
  score?: number;
  status: string;
  timestamp: string;
}

export function Overview() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesItem[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [kpi, ts, traffic, acts] = await Promise.all([
        AdminApiService.getKPI(),
        AdminApiService.getTimeSeries(),
        AdminApiService.getTrafficSources(),
        AdminApiService.getActivities(),
      ]);
      setKpiData(kpi);
      setTimeSeries(ts);
      setTrafficSources(traffic);
      setActivities(acts);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load overview data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const kpiCards = kpiData ? [
    { title: 'Active Now', value: kpiData.activeNow.toLocaleString(), subtitle: 'vs yesterday', change: kpiData.activeNowChange, icon: 'users' as const },
    { title: 'Sessions Today', value: kpiData.sessionsToday.toLocaleString(), subtitle: 'Daily engagement', change: kpiData.sessionsChange, icon: 'sessions' as const },
    { title: 'Pass Rate Avg', value: `${kpiData.passRate}%`, subtitle: 'Platform performance', change: kpiData.passRateChange, icon: 'passRate' as const },
    { title: 'Exams Taken', value: kpiData.examsTaken.toLocaleString(), subtitle: "Today's total", change: kpiData.examsChange, icon: 'exams' as const },
    { title: 'Avg Duration', value: `${kpiData.avgDuration} min`, subtitle: 'Time per session', change: kpiData.durationChange, icon: 'duration' as const },
    { title: 'Countries', value: `${kpiData.countries} active`, subtitle: 'Regional reach', change: kpiData.countriesChange, icon: 'countries' as const },
  ] : [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Real-time engagement and academic performance across all regions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" className="gap-2 bg-muted border-border hover:bg-muted/80 w-full sm:w-auto">
            <Calendar className="w-4 h-4" />
            Last 24 Hours
          </Button>
          <Button variant="outline" className="gap-2 bg-muted border-border hover:bg-muted/80 w-full sm:w-auto">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-yellow-300">
          {error}
        </div>
      )}

      {loading && !kpiData ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Loading dashboard data...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiCards.map((card, index) => (
              <KPICard key={card.title} {...card} index={index} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <ActivityChart data={timeSeries} />
            </div>
            <div className="lg:col-span-2">
              <TrafficSourcesChart data={trafficSources} />
            </div>
          </div>

          <ActivityFeed activities={activities} />
        </>
      )}
    </div>
  );
}
