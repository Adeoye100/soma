import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, CheckCircle, RotateCcw, FileCheck } from 'lucide-react';

const actionIcons = {
  started_exam: Play,
  completed_exam: CheckCircle,
  submitted_quiz: FileCheck,
  retake_completed: RotateCcw,
  started_quiz: Play,
};

const actionLabels = {
  started_exam: 'Started Exam',
  completed_exam: 'Completed Exam',
  submitted_quiz: 'Submitted Quiz',
  retake_completed: 'Retake Completed',
  started_quiz: 'Started Quiz',
};

export function ActivityFeed() {
  const { activities } = useDashboardStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-success/10 text-success border-success/20';
      case 'failed':
        return 'bg-danger/10 text-danger border-danger/20';
      case 'in_progress':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRowColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'hover:bg-success/5';
      case 'failed':
        return 'hover:bg-danger/5';
      case 'in_progress':
        return 'hover:bg-primary/5';
      default:
        return 'hover:bg-white/5';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="card-surface p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Live Academic Stream</h3>
          <p className="text-sm text-muted-foreground">
            Real-time submissions from across the continent
          </p>
        </div>
        <button className="text-sm text-primary hover:underline">
          View All Activity
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Action
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Subject
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Score
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {activities.slice(0, 10).map((activity) => {
                const ActionIcon = actionIcons[activity.action];
                
                return (
                  <motion.tr
                    key={activity.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "border-b border-white/[0.05] transition-colors",
                      getRowColor(activity.status)
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={activity.userAvatar}
                          alt={activity.userName}
                          className="w-8 h-8 rounded-full bg-primary/20"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">{activity.userName}</p>
                          <p className="text-xs text-muted-foreground">{activity.userCountry}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ActionIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-white">
                          {actionLabels[activity.action]}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-white">{activity.subject}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-white">
                        {activity.score !== undefined ? `${activity.score}/100` : '--'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs capitalize", getStatusColor(activity.status))}
                      >
                        {activity.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {formatTime(activity.timestamp)}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
