
export enum ExamType {
  OBJECTIVE = 'Objective',
  SHORT_ANSWER = 'Short Answer',
  ESSAY = 'Essay',
}

export enum Difficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum TimeIntensity {
  RELAXED = 'Relaxed', // 3 mins per question
  MODERATE = 'Moderate', // 1.5 mins per question
  CHALLENGING = 'Challenging', // 45 secs per question
}

export interface ExamConfig {
  type: ExamType;
  difficulty: Difficulty;
  intensity: TimeIntensity;
  numQuestions: number;
}

export interface Material {
  name: string;
  content: string; // base64
  mimeType: string;
}

export interface Question {
  question: string;
  options?: string[];
  correctAnswer: string;
  topic: string;
}

export type UserAnswer = string;

export interface Evaluation {
  score: number;
  feedback: string;
  isCorrect: boolean;
  topic: string;
}

export interface ExamResult {
  questions: Question[];
  userAnswers: UserAnswer[];
  evaluations: Evaluation[];
  timeTaken: number;
  config: ExamConfig;
  score: number;
  totalQuestions: number;
  date?: string;
}

export interface WeeklyPerformance {
  weekStart: string;
  weekEnd: string;
  examsCompleted: number;
  averageScore: number;
  totalTimeSpent: number;
  topicBreakdown: { [key: string]: number };
  improvementTrend: number;
}

export interface PerformanceInsight {
  type: 'improvement' | 'strength' | 'weakness' | 'recommendation';
  message: string;
  topic?: string;
  metric?: number;
}
