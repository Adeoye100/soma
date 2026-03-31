export type { User, Badge, Activity, KPIData, TimeSeriesData, TrafficSource, 
  CountryData, RegionData, SubjectPerformance, ScoreDistribution,
  PerformanceTrend, FunnelStage, LeaderboardEntry, ExamAnalytics,
  Notification, SystemHealth, HeatmapData, PageView, QuestionDifficulty,
  SkippedQuestion };

// User types
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  country: string;
  countryCode: string;
  role: 'student' | 'admin' | 'analyst' | 'super-admin';
  status: 'active' | 'inactive' | 'banned' | 'pending';
  joinedAt: Date;
  lastActive: Date;
  totalScore: number;
  passRate: number;
  examsCompleted: number;
  streak: number;
  badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt: Date;
}

// Activity types
interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userCountry: string;
  action: 'started_exam' | 'completed_exam' | 'submitted_quiz' | 'retake_completed' | 'started_quiz';
  subject: string;
  score?: number;
  status: 'passed' | 'failed' | 'in_progress';
  timestamp: Date;
}

// Analytics types
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

interface TimeSeriesData {
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

interface CountryData {
  rank: number;
  country: string;
  flag: string;
  users: number;
  exams: number;
  passRate: number;
  coordinates: [number, number];
}

interface RegionData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface SubjectPerformance {
  subject: string;
  thisMonth: number;
  lastMonth: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
  color: string;
}

interface PerformanceTrend {
  date: string;
  mathematics: number;
  english: number;
  biology: number;
  chemistry: number;
  physics: number;
  economics: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

interface LeaderboardEntry {
  rank: number;
  user: User;
  totalScore: number;
  passRate: number;
  examsCompleted: number;
  streak: number;
}

interface ExamAnalytics {
  examId: string;
  examName: string;
  totalAttempts: number;
  passRate: number;
  avgTime: number;
  retakeRate: number;
  hardestQuestions: QuestionDifficulty[];
  skippedQuestions: SkippedQuestion[];
}

interface QuestionDifficulty {
  questionId: string;
  questionText: string;
  failRate: number;
}

interface SkippedQuestion {
  questionId: string;
  questionText: string;
  skipCount: number;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface SystemHealth {
  uptime: number;
  apiResponseTime: number;
  websocketConnections: number;
  dbQueryTime: number;
  errorRate4xx: number;
  errorRate5xx: number;
  services: {
    api: 'healthy' | 'degraded' | 'down';
    database: 'healthy' | 'degraded' | 'down';
    storage: 'healthy' | 'degraded' | 'down';
    auth: 'healthy' | 'degraded' | 'down';
  };
}

interface HeatmapData {
  day: string;
  hour: number;
  value: number;
}

type PageView = 
  | 'overview' 
  | 'users' 
  | 'location' 
  | 'academic' 
  | 'exams' 
  | 'leaderboard' 
  | 'content' 
  | 'notifications' 
  | 'health' 
  | 'settings';
