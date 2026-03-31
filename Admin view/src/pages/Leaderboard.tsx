import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Trophy, Flame, TrendingUp, BookOpen, RefreshCw } from 'lucide-react';

export function Leaderboard() {
  const { leaderboard, fetchLeaderboard } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const entries = leaderboard?.leaderboard || [];

  const filtered = entries.filter(e =>
    (e.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.country || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topThree = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">Top performers from user profiles.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={fetchLeaderboard}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </motion.div>

      {/* Podium */}
      {topThree.length >= 3 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-end justify-center gap-4 md:gap-8 h-[200px]">
          {podiumOrder.map((index, position) => {
            const entry = topThree[index];
            if (!entry) return null;
            const heights = ['h-32', 'h-44', 'h-24'];
            const medals = ['🥈', '🥇', '🥉'];
            return (
              <motion.div key={entry.userId} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + position * 0.1, type: 'spring' }} className="flex flex-col items-center">
                <div className="relative mb-3">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                    {(entry.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border-2 border-white/20 flex items-center justify-center text-sm">
                    {medals[position]}
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground text-center max-w-[100px] truncate">{entry.username || 'Anonymous'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Trophy className="w-3 h-3 text-primary" />
                  <span className="text-sm font-bold text-primary">{entry.averageScore.toFixed(1)}%</span>
                </div>
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.4 + position * 0.1, duration: 0.5 }}
                  className={`w-20 md:w-24 ${heights[position]} mt-3 rounded-t-lg bg-gradient-to-t from-white/10 to-white/5 border border-white/10 flex items-end justify-center pb-2`}
                  style={{ transformOrigin: 'bottom' }}>
                  <span className="text-xl font-bold text-white/30">{index + 1}</span>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search students..." className="pl-10 bg-white/5 border-white/[0.07]" />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-surface overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/5">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Rank</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Student</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Country</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Avg Score</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Best</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Exams</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Streak</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No leaderboard data</td></tr>
            ) : filtered.map((entry) => (
              <tr key={entry.userId} className="border-b border-white/[0.05] hover:bg-white/5 transition-colors">
                <td className="py-3 px-4"><span className="text-sm font-medium text-muted-foreground">#{entry.rank}</span></td>
                <td className="py-3 px-4"><span className="text-sm font-medium text-foreground">{entry.username || 'Anonymous'}</span></td>
                <td className="py-3 px-4"><span className="text-sm text-muted-foreground">{entry.country || '--'}</span></td>
                <td className="py-3 px-4"><span className="text-sm font-bold text-primary">{entry.averageScore.toFixed(1)}%</span></td>
                <td className="py-3 px-4"><span className="text-sm text-success">{entry.bestScore.toFixed(1)}%</span></td>
                <td className="py-3 px-4"><span className="text-sm text-foreground">{entry.totalExams}</span></td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-foreground">{entry.currentStreak}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
