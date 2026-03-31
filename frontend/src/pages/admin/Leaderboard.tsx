import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminApiService } from '../../services/admin/adminApiService';
import type { LeaderboardEntry } from '../../services/admin/adminApiService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Search, Download, Trophy, Flame,
  TrendingUp, BookOpen, Calendar, MapPin, Star
} from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'passRate' | 'exams' | 'streak'>('score');
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await AdminApiService.getLeaderboard();
        setLeaderboardData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch leaderboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const topThree = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);

  const filteredData = rest.filter(entry =>
    entry.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.user.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'score': return b.totalScore - a.totalScore;
      case 'passRate': return b.passRate - a.passRate;
      case 'exams': return b.examsCompleted - a.examsCompleted;
      case 'streak': return b.streak - a.streak;
      default: return 0;
    }
  });

  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-surface p-6 border border-danger/20">
        <p className="text-danger font-medium">Error loading leaderboard</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">
            Top performers and academic achievers across the platform.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 bg-white/5 border-white/[0.07] hover:bg-white/10"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Podium */}
      {topThree.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-end justify-center gap-4 md:gap-8 h-[280px]"
        >
          {podiumOrder.map((index, position) => {
            const entry = topThree[index];
            const heights = ['h-40', 'h-52', 'h-32'];
            const medals = ['🥈', '🥇', '🥉'];
            const colors = ['from-gray-400 to-gray-500', 'from-yellow-400 to-yellow-500', 'from-orange-400 to-orange-500'];

            return (
              <motion.div
                key={entry.user.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + position * 0.1, type: 'spring' }}
                className="flex flex-col items-center"
              >
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br ${colors[position]} p-0.5`}>
                    <img
                      src={entry.user.avatar}
                      alt={entry.user.name}
                      className="w-full h-full rounded-full bg-card"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-white/20 flex items-center justify-center text-lg">
                    {medals[position]}
                  </div>
                </div>

                {/* Name & Stats */}
                <p className="text-sm font-semibold text-white text-center max-w-[120px] truncate">
                  {entry.user.name}
                </p>
                <p className="text-xs text-muted-foreground">{entry.user.country}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Trophy className="w-3 h-3 text-primary" />
                  <span className="text-sm font-bold text-primary">{entry.totalScore}</span>
                </div>

                {/* Podium */}
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.4 + position * 0.1, duration: 0.5 }}
                  className={`w-20 md:w-28 ${heights[position]} mt-4 rounded-t-lg bg-gradient-to-t from-white/10 to-white/5 border border-white/10 flex items-end justify-center pb-2`}
                  style={{ transformOrigin: 'bottom' }}
                >
                  <span className="text-2xl font-bold text-white/30">{index + 1}</span>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="pl-10 bg-white/5 border-white/[0.07]"
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/[0.07]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Total Score</SelectItem>
            <SelectItem value="passRate">Pass Rate</SelectItem>
            <SelectItem value="exams">Exams Completed</SelectItem>
            <SelectItem value="streak">Streak</SelectItem>
          </SelectContent>
        </Select>

        <Tabs defaultValue="all">
          <TabsList className="bg-white/5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Rankings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-surface overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/5">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Rank</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Student</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Country</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                <div className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Score
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Pass%
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Exams
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  Streak
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Badges</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedData.map((entry) => (
                <motion.tr
                  key={entry.user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border-b border-white/[0.05] hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(entry)}
                >
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={entry.user.avatar}
                        alt={entry.user.name}
                        className="w-8 h-8 rounded-full bg-primary/20"
                      />
                      <span className="text-sm font-medium text-white">{entry.user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">{entry.user.country}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-bold text-primary">{entry.totalScore}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm ${entry.passRate >= 70 ? 'text-success' : entry.passRate >= 50 ? 'text-warning' : 'text-danger'}`}>
                      {entry.passRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-white">{entry.examsCompleted}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-white">{entry.streak}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex -space-x-1">
                      {entry.user.badges.slice(0, 3).map((badge) => (
                        <div
                          key={badge.id}
                          className="w-6 h-6 rounded-full bg-primary/20 border border-card flex items-center justify-center text-xs"
                          title={badge.name}
                        >
                          {badge.icon}
                        </div>
                      ))}
                      {entry.user.badges.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-white/10 border border-card flex items-center justify-center text-xs text-muted-foreground">
                          +{entry.user.badges.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl bg-card border-white/[0.07]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Student Profile
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <img
                  src={selectedUser.user.avatar}
                  alt={selectedUser.user.name}
                  className="w-20 h-20 rounded-full bg-primary/20"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{selectedUser.user.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {selectedUser.user.country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {new Date(selectedUser.user.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      <Trophy className="w-3 h-3 mr-1" />
                      Rank #{selectedUser.rank}
                    </Badge>
                    <Badge variant="outline" className="bg-success/10 text-success">
                      <Star className="w-3 h-3 mr-1" />
                      {selectedUser.user.badges.length} Badges
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Score', value: selectedUser.totalScore, icon: Trophy },
                  { label: 'Pass Rate', value: `${selectedUser.passRate}%`, icon: TrendingUp },
                  { label: 'Exams', value: selectedUser.examsCompleted, icon: BookOpen },
                  { label: 'Streak', value: selectedUser.streak, icon: Flame },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-xl bg-white/5 text-center">
                    <stat.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Score Trend */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Score Trend</h4>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { day: 'Mon', score: 65 },
                      { day: 'Tue', score: 72 },
                      { day: 'Wed', score: 68 },
                      { day: 'Thu', score: 75 },
                      { day: 'Fri', score: 82 },
                      { day: 'Sat', score: 78 },
                      { day: 'Sun', score: 85 },
                    ]}>
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#6C63FF"
                        strokeWidth={2}
                        dot={{ fill: '#6C63FF', strokeWidth: 0 }}
                      />
                      <XAxis dataKey="day" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload) {
                            return (
                              <div className="bg-card border border-white/[0.07] rounded-lg p-2">
                                <p className="text-sm font-bold text-white">
                                  {payload[0].value} pts
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Badges */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Achievements</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.user.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5"
                    >
                      <span className="text-lg">{badge.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{badge.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
