import { motion } from 'framer-motion';
import { DotMatrixGlobe } from '@/components/globe/DotMatrixGlobe';
import { countryData, regionData, heatmapData } from '@/data/mockData';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, Download, MapPin } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export function LocationIntelligence() {
  const maxUsers = Math.max(...countryData.map(c => c.users));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
          <p className="text-sm font-medium text-white">{data.name}</p>
          <p className="text-lg font-bold text-white">{data.percentage}%</p>
          <p className="text-xs text-muted-foreground">
            {data.value.toLocaleString()} users
          </p>
        </div>
      );
    }
    return null;
  };

  // Generate heatmap grid data
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Location Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Global user distribution and regional engagement metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2 bg-white/5 border-white/[0.07] hover:bg-white/10"
          >
            <Filter className="w-4 h-4" />
            Filter by Region
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 bg-white/5 border-white/[0.07] hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>
      </motion.div>

      {/* Globe */}
      <DotMatrixGlobe />

      {/* Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-surface p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top Countries by Active Users</h3>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Live
            </Badge>
          </div>

          <div className="space-y-3">
            {countryData.map((country, index) => (
              <motion.div
                key={country.country}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {country.rank}
                </span>
                <span className="text-2xl">{country.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{country.country}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {country.users.toLocaleString()} users
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {country.exams.toLocaleString()} exams
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{country.passRate}%</p>
                  <p className="text-xs text-success">pass rate</p>
                </div>
                <div className="w-24">
                  <Progress 
                    value={(country.users / maxUsers) * 100} 
                    className="h-1.5"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Region Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-surface p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Regional Distribution</h3>
            <Button variant="ghost" size="sm" className="text-primary">
              <MapPin className="w-4 h-4 mr-1" />
              Filter Globe
            </Button>
          </div>

          <div className="h-[200px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={regionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {regionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {regionData.map((region) => (
              <div 
                key={region.name}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: region.color }}
                />
                <span className="text-sm text-white flex-1">{region.name}</span>
                <span className="text-sm font-medium text-white">{region.percentage}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-surface p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Activity Heatmap</h3>
            <p className="text-sm text-muted-foreground">
              User engagement intensity by day and hour (UTC)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Low</span>
            <div className="flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                <div
                  key={opacity}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: `rgba(108, 99, 255, ${opacity})` }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">High</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Hour labels */}
            <div className="flex gap-1 mb-1">
              <div className="w-12" /> {/* Day label spacer */}
              {hours.filter((_, i) => i % 3 === 0).map((hour) => (
                <div key={hour} className="flex-1 text-center">
                  <span className="text-xs text-muted-foreground">{hour}:00</span>
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {days.map((day) => (
              <div key={day} className="flex gap-1 mb-1">
                <div className="w-12 flex items-center">
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
                {hours.map((hour) => {
                  const dataPoint = heatmapData.find(
                    d => d.day === day && d.hour === hour
                  );
                  const intensity = dataPoint ? dataPoint.value / 100 : 0;
                  
                  return (
                    <motion.div
                      key={`${day}-${hour}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.random() * 0.5 }}
                      className="flex-1 aspect-square rounded"
                      style={{
                        backgroundColor: `rgba(108, 99, 255, ${0.1 + intensity * 0.9})`,
                      }}
                      title={`${day} ${hour}:00 - ${dataPoint?.value || 0} active users`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
