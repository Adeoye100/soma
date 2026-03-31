import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Users, BookOpen, CheckCircle, FileText, Clock, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: 'users' | 'sessions' | 'passRate' | 'exams' | 'duration' | 'countries';
  index: number;
}

const iconMap = {
  users: Users,
  sessions: BookOpen,
  passRate: CheckCircle,
  exams: FileText,
  duration: Clock,
  countries: Globe,
};

const iconColors = {
  users: 'from-blue-500 to-blue-600',
  sessions: 'from-purple-500 to-purple-600',
  passRate: 'from-green-500 to-green-600',
  exams: 'from-orange-500 to-orange-600',
  duration: 'from-cyan-500 to-cyan-600',
  countries: 'from-pink-500 to-pink-600',
};

export function KPICard({ title, value, subtitle, change, icon, index }: KPICardProps) {
  const Icon = iconMap[icon];
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = change === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="card-surface p-5 min-w-[200px] flex-1"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{value}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
          iconColors[icon]
        )}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isPositive && "text-success",
            isNegative && "text-danger",
            isNeutral && "text-muted-foreground"
          )}>
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {isNeutral && <Minus className="w-3 h-3" />}
            <span>
              {isPositive ? '+' : ''}{change}%
            </span>
          </div>
          <span className="text-xs text-muted-foreground">vs yesterday</span>
        </div>
      )}
    </motion.div>
  );
}
