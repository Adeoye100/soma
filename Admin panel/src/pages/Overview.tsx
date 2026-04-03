import { motion } from 'framer-motion';
import { KPICard } from '@/components/KPICard';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { TrafficSourcesChart } from '@/components/charts/TrafficSourcesChart';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { Download, Calendar } from 'lucide-react';

export function Overview() {
  const { kpiData } = useDashboardStore();

  const kpiCards = [
    {
      title: 'Active Now',
      value: kpiData.activeNow.toLocaleString(),
      subtitle: 'vs yesterday',
      change: kpiData.activeNowChange,
      icon: 'users' as const,
    },
    {
      title: 'Sessions Today',
      value: kpiData.sessionsToday.toLocaleString(),
      subtitle: 'Daily engagement',
      change: kpiData.sessionsChange,
      icon: 'sessions' as const,
    },
    {
      title: 'Pass Rate Avg',
      value: `${kpiData.passRate}%`,
      subtitle: 'Platform performance',
      change: kpiData.passRateChange,
      icon: 'passRate' as const,
    },
    {
      title: 'Exams Taken',
      value: kpiData.examsTaken.toLocaleString(),
      subtitle: "Today's total",
      change: kpiData.examsChange,
      icon: 'exams' as const,
    },
    {
      title: 'Avg Duration',
      value: `${kpiData.avgDuration} min`,
      subtitle: 'Time per session',
      change: kpiData.durationChange,
      icon: 'duration' as const,
    },
    {
      title: 'Countries',
      value: `${kpiData.countries} active`,
      subtitle: 'Regional reach',
      change: kpiData.countriesChange,
      icon: 'countries' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <Button 
            variant="outline" 
            className="gap-2 bg-muted border-border hover:bg-muted/80 w-full sm:w-auto"
          >
            <Calendar className="w-4 h-4" />
            Last 24 Hours
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 bg-muted border-border hover:bg-muted/80 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, index) => (
          <KPICard
            key={card.title}
            {...card}
            index={index}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <ActivityChart />
        </div>
        <div className="lg:col-span-2">
          <TrafficSourcesChart />
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  );
}
