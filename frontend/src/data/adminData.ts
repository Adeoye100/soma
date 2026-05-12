import type { 
  User, Activity, KPIData, TimeSeriesData, TrafficSource, 
  CountryData, RegionData, SubjectPerformance, ScoreDistribution,
  PerformanceTrend, FunnelStage, LeaderboardEntry, ExamAnalytics,
  Notification, SystemHealth, HeatmapData, Badge
} from '../types/admin';

// African names for realistic data
const firstNames = [
  'Chidi', 'Ngozi', 'Kofi', 'Ama', 'Jabari', 'Zainab', 'Olumide', 'Fatima',
  'Kwame', 'Amina', 'Tunde', 'Nkechi', 'Oluwaseun', 'Abeni', 'Mensah', 'Yusuf',
  'Chioma', 'Emmanuel', 'Adesua', 'Ibrahim', 'Opeyemi', 'Adeola', 'Chinedu',
  'Halima', 'Folake', 'Segun', 'Nana', 'Kofi', 'Akua', 'Kwaku'
];

const lastNames = [
  'Obi', 'Adeyemi', 'Mensah', 'Owusu', 'Otieno', 'Yusuf', 'Adeleke', 'Mohammed',
  'Asante', 'Bello', 'Okafor', 'Nwosu', 'Ajayi', 'Ojo', 'Koffi', 'Addo',
  'Osei', 'Boateng', 'Mwangi', 'Kamau', 'Oduro', 'Tetteh', 'Nduka',
  'Eze', 'Onyeka', 'Balogun', 'Fashola', 'Akindele', 'Okonkwo', 'Ibe'
];

const countries = [
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭' },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬' },
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿' },
  { name: 'Zambia', code: 'ZM', flag: '🇿🇲' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'United States', code: 'US', flag: '🇺🇸' },
];

const subjects = [
  'Mathematics', 'English Language', 'Biology', 'Chemistry', 
  'Physics', 'Economics', 'Government', 'Literature in English'
];

const examTypes = ['WAEC', 'NECO', 'JAMB', 'GCE', 'Mock Exam'];

const actions = ['started_exam', 'completed_exam', 'submitted_quiz', 'retake_completed', 'started_quiz'] as const;

// Generate random user
export const generateUser = (id: string): User => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const country = countries[Math.floor(Math.random() * countries.length)];
  const examsCompleted = Math.floor(Math.random() * 50) + 1;
  const passRate = Math.min(95, Math.max(30, 58 + (Math.random() * 30 - 15)));
  
  return {
    id,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    country: country.name,
    countryCode: country.code,
    role: 'student',
    status: Math.random() > 0.1 ? 'active' : 'inactive',
    joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    totalScore: Math.floor(Math.random() * 40) + 60,
    passRate: parseFloat(passRate.toFixed(1)),
    examsCompleted,
    streak: Math.floor(Math.random() * 30),
    badges: generateBadges(Math.floor(Math.random() * 5)),
  };
};

const generateBadges = (count: number): Badge[] => {
  const badgeNames = ['Fast Learner', 'Perfect Score', 'Streak Master', 'Subject Expert', 'Top Performer'];
  return Array.from({ length: count }, (_, i) => ({
    id: `badge-${i}`,
    name: badgeNames[i % badgeNames.length],
    icon: '🏆',
    earnedAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
  }));
};

// Generate mock users
export const mockUsers: User[] = Array.from({ length: 100 }, (_, i) => generateUser(`user-${i}`));

// Generate activity
export const generateActivity = (id: string): Activity => {
  const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  const score = action === 'started_exam' || action === 'started_quiz' ? undefined : Math.floor(Math.random() * 100);
  
  let status: 'passed' | 'failed' | 'in_progress' = 'in_progress';
  if (score !== undefined) {
    status = score >= 50 ? 'passed' : 'failed';
  }
  
  return {
    id,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    userCountry: user.country,
    action,
    subject,
    score,
    status,
    timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
  };
};

// Initial activities
export const mockActivities: Activity[] = Array.from({ length: 50 }, (_, i) => 
  generateActivity(`activity-${i}`)
).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

// KPI Data
export const kpiData: KPIData = {
  activeNow: 1284,
  activeNowChange: 12,
  sessionsToday: 8302,
  sessionsChange: 5.2,
  passRate: 74.3,
  passRateChange: 2.1,
  examsTaken: 3940,
  examsChange: 7,
  avgDuration: 42,
  durationChange: 0,
  countries: 14,
  countriesChange: 3,
};

// Time series data for charts
export const timeSeriesData: TimeSeriesData[] = [
  { time: '08:00 AM', activeSessions: 450, examAttempts: 120 },
  { time: '09:00 AM', activeSessions: 680, examAttempts: 180 },
  { time: '10:00 AM', activeSessions: 920, examAttempts: 250 },
  { time: '11:00 AM', activeSessions: 1150, examAttempts: 320 },
  { time: '12:00 PM', activeSessions: 1284, examAttempts: 380 },
  { time: '01:00 PM', activeSessions: 1100, examAttempts: 340 },
  { time: '02:00 PM', activeSessions: 980, examAttempts: 290 },
  { time: '03:00 PM', activeSessions: 1050, examAttempts: 310 },
  { time: '04:00 PM', activeSessions: 1200, examAttempts: 360 },
  { time: 'Now', activeSessions: 1284, examAttempts: 394 },
];

// Traffic sources
export const trafficSources: TrafficSource[] = [
  { name: 'Direct Traffic', value: 3486, percentage: 42, change: 5, color: '#6C63FF' },
  { name: 'Organic Search', value: 2324, percentage: 28, change: 12, color: '#22C55E' },
  { name: 'Referral', value: 1494, percentage: 18, change: -2, color: '#F59E0B' },
  { name: 'Social Media', value: 996, percentage: 12, change: 0, color: '#3B82F6' },
];

// Country data
export const countryData: CountryData[] = [
  { rank: 1, country: 'Nigeria', flag: '🇳🇬', users: 4520, exams: 12580, passRate: 72.5, coordinates: [9.082, 8.6753] },
  { rank: 2, country: 'Kenya', flag: '🇰🇪', users: 2890, exams: 8340, passRate: 76.2, coordinates: [-0.0236, 37.9062] },
  { rank: 3, country: 'Ghana', flag: '🇬🇭', users: 2150, exams: 6420, passRate: 74.8, coordinates: [7.9465, -1.0232] },
  { rank: 4, country: 'South Africa', flag: '🇿🇦', users: 1680, exams: 4890, passRate: 78.3, coordinates: [-30.5595, 22.9375] },
  { rank: 5, country: 'Uganda', flag: '🇺🇬', users: 1240, exams: 3650, passRate: 71.2, coordinates: [1.3733, 32.2903] },
  { rank: 6, country: 'Tanzania', flag: '🇹🇿', users: 980, exams: 2840, passRate: 69.8, coordinates: [-6.369, 34.8888] },
  { rank: 7, country: 'Zambia', flag: '🇿🇲', users: 720, exams: 2150, passRate: 73.5, coordinates: [-13.1339, 27.8493] },
  { rank: 8, country: 'United Kingdom', flag: '🇬🇧', users: 450, exams: 1280, passRate: 81.2, coordinates: [55.3781, -3.436] },
  { rank: 9, country: 'United States', flag: '🇺🇸', users: 380, exams: 1120, passRate: 79.5, coordinates: [37.0902, -95.7129] },
];

// Region data
export const regionData: RegionData[] = [
  { name: 'West Africa', value: 6670, percentage: 52, color: '#6C63FF' },
  { name: 'East Africa', value: 5110, percentage: 40, color: '#22C55E' },
  { name: 'Southern Africa', value: 1680, percentage: 13, color: '#F59E0B' },
  { name: 'Diaspora', value: 830, percentage: 6, color: '#3B82F6' },
  { name: 'Other', value: 120, percentage: 1, color: '#6B7280' },
];

// Subject performance
export const subjectPerformance: SubjectPerformance[] = [
  { subject: 'Mathematics', thisMonth: 68.5, lastMonth: 65.2 },
  { subject: 'English', thisMonth: 76.3, lastMonth: 74.8 },
  { subject: 'Biology', thisMonth: 72.1, lastMonth: 70.5 },
  { subject: 'Chemistry', thisMonth: 65.8, lastMonth: 63.2 },
  { subject: 'Physics', thisMonth: 61.4, lastMonth: 59.8 },
  { subject: 'Economics', thisMonth: 74.2, lastMonth: 72.6 },
  { subject: 'Government', thisMonth: 78.5, lastMonth: 76.9 },
  { subject: 'Literature', thisMonth: 71.3, lastMonth: 69.7 },
];

// Score distribution
export const scoreDistribution: ScoreDistribution[] = [
  { range: '0-10', count: 45, color: '#EF4444' },
  { range: '11-20', count: 78, color: '#EF4444' },
  { range: '21-30', count: 124, color: '#EF4444' },
  { range: '31-40', count: 186, color: '#EF4444' },
  { range: '41-50', count: 342, color: '#F59E0B' },
  { range: '51-60', count: 580, color: '#F59E0B' },
  { range: '61-70', count: 720, color: '#22C55E' },
  { range: '71-80', count: 650, color: '#22C55E' },
  { range: '81-90', count: 420, color: '#22C55E' },
  { range: '91-100', count: 155, color: '#22C55E' },
];

// Performance trends
export const performanceTrends: PerformanceTrend[] = [
  { date: 'Mon', mathematics: 62, english: 74, biology: 70, chemistry: 64, physics: 58, economics: 72 },
  { date: 'Tue', mathematics: 65, english: 75, biology: 71, chemistry: 65, physics: 60, economics: 73 },
  { date: 'Wed', mathematics: 63, english: 76, biology: 72, chemistry: 63, physics: 59, economics: 74 },
  { date: 'Thu', mathematics: 67, english: 74, biology: 73, chemistry: 66, physics: 62, economics: 72 },
  { date: 'Fri', mathematics: 66, english: 77, biology: 71, chemistry: 65, physics: 61, economics: 75 },
  { date: 'Sat', mathematics: 68, english: 76, biology: 74, chemistry: 67, physics: 63, economics: 74 },
  { date: 'Sun', mathematics: 69, english: 78, biology: 75, chemistry: 68, physics: 64, economics: 76 },
];

// Funnel data
export const funnelData: FunnelStage[] = [
  { stage: 'Enrolled', count: 15000, percentage: 100 },
  { stage: 'Started', count: 12500, percentage: 83.3 },
  { stage: 'Completed', count: 9800, percentage: 65.3 },
  { stage: 'Passed', count: 7280, percentage: 48.5 },
  { stage: 'Distinction', count: 2340, percentage: 15.6 },
];

// Leaderboard
export const leaderboardData: LeaderboardEntry[] = mockUsers
  .map((user, index) => ({
    rank: index + 1,
    user,
    totalScore: user.totalScore,
    passRate: user.passRate,
    examsCompleted: user.examsCompleted,
    streak: user.streak,
  }))
  .sort((a, b) => b.totalScore - a.totalScore)
  .map((entry, index) => ({ ...entry, rank: index + 1 }))
  .slice(0, 50);

// Exam analytics
export const examAnalyticsData: ExamAnalytics[] = examTypes.map((exam, i) => ({
  examId: `exam-${i}`,
  examName: exam,
  totalAttempts: Math.floor(Math.random() * 5000) + 1000,
  passRate: parseFloat((Math.random() * 30 + 60).toFixed(1)),
  avgTime: Math.floor(Math.random() * 30) + 30,
  retakeRate: parseFloat((Math.random() * 20 + 10).toFixed(1)),
  hardestQuestions: [
    { questionId: 'q1', questionText: 'Complex integration problem', failRate: 78.5 },
    { questionId: 'q2', questionText: 'Organic chemistry reaction mechanism', failRate: 72.3 },
    { questionId: 'q3', questionText: 'Shakespeare analysis', failRate: 68.9 },
  ],
  skippedQuestions: [
    { questionId: 'q4', questionText: 'Calculus word problem', skipCount: 450 },
    { questionId: 'q5', questionText: 'Physics derivation', skipCount: 380 },
    { questionId: 'q6', questionText: 'Essay writing prompt', skipCount: 320 },
  ],
}));

// Notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'New User Registration',
    message: '150 new students joined from Nigeria today',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Pass Rate Alert',
    message: 'Physics pass rate dropped below 60%',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'System Update',
    message: 'Platform will undergo maintenance at 2 AM UTC',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: '4',
    type: 'error',
    title: 'Server Error',
    message: 'API response time exceeded 2s threshold',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: '5',
    type: 'success',
    title: 'Milestone Reached',
    message: '10,000 exams completed this month!',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    read: true,
  },
];

// System health
export const systemHealthData: SystemHealth = {
  uptime: 99.9,
  apiResponseTime: 145,
  websocketConnections: 1284,
  dbQueryTime: 23,
  errorRate4xx: 0.8,
  errorRate5xx: 0.2,
  services: {
    api: 'healthy',
    database: 'healthy',
    storage: 'healthy',
    auth: 'healthy',
  },
};

// Heatmap data
export const generateHeatmapData = (): HeatmapData[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data: HeatmapData[] = [];
  
  days.forEach(day => {
    for (let hour = 0; hour < 24; hour++) {
      data.push({
        day,
        hour,
        value: Math.floor(Math.random() * 100),
      });
    }
  });
  
  return data;
};

export const heatmapData = generateHeatmapData();

// API response time history
export const apiResponseHistory = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}m ago`,
  responseTime: Math.floor(Math.random() * 100) + 100,
}));

// Error rate history
export const errorRateHistory = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  errors4xx: Math.floor(Math.random() * 10),
  errors5xx: Math.floor(Math.random() * 5),
}));
