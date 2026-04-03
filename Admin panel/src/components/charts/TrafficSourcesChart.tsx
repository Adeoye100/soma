import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { trafficSources } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function TrafficSourcesChart() {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
          <p className="text-sm font-medium text-white">{data.name}</p>
          <p className="text-lg font-bold text-white">{data.percentage}%</p>
          <p className="text-xs text-muted-foreground">
            {data.value.toLocaleString()} visits
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="card-surface p-5 h-full"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Traffic Sources</h3>
        <p className="text-sm text-muted-foreground">Where users come from</p>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-full h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={trafficSources}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                animationDuration={1500}
                animationBegin={0}
              >
                {trafficSources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center text */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <p className="text-2xl font-bold text-white">100%</p>
          <p className="text-xs text-muted-foreground">GLOBAL</p>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 mt-4">
        {trafficSources.map((source, index) => (
          <motion.div
            key={source.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: source.color }}
              />
              <span className="text-sm text-white">{source.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">{source.percentage}%</span>
              <div className={cn(
                "flex items-center gap-0.5 text-xs",
                source.change > 0 && "text-success",
                source.change < 0 && "text-danger",
                source.change === 0 && "text-muted-foreground"
              )}>
                {source.change > 0 && <TrendingUp className="w-3 h-3" />}
                {source.change < 0 && <TrendingDown className="w-3 h-3" />}
                {source.change === 0 && <Minus className="w-3 h-3" />}
                <span>{source.change > 0 ? '+' : ''}{source.change}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
