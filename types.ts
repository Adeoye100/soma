export enum QuestionType {
  MULTIPLE_CHOICE = 'Multiple Choice',
  TRUE_FALSE = 'True/False',
  FILL_IN_THE_BLANK = 'Fill-in-the-Blank',
  MATCHING = 'Matching',
  SHORT_ANSWER = 'Short Answer',
  ESSAY = 'Essay',
}

export enum ExamType {
  MIXED = 'Mixed',
  MULTIPLE_CHOICE = 'Multiple Choice',
  TRUE_FALSE = 'True/False',
  FILL_IN_THE_BLANK = 'Fill-in-the-Blank',
  MATCHING = 'Matching',
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

export interface PracticeConfig {
  topics: string[];
  questionTypes: QuestionType[];
  difficulty: Difficulty;
  numQuestions: number;
}

export interface Material {
  name: string;
  content: string; // base64
  mimeType: string;
}

export interface MatchingPair {
  prompt: string;
  answer: string;
}

export interface Question {
  question: string;
  type: QuestionType;
  topic: string;
  // For MULTIPLE_CHOICE
  options?: string[];
  // For MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY
  correctAnswer?: string;
  // For FILL_IN_THE_BLANK
  correctAnswers?: string[];
  // For MATCHING
  matchingPairs?: MatchingPair[];
}

// User's answer for a single question
export type UserAnswer = string | string[] | Record<string, string> | null;

export interface CriterionFeedback {
    criterion: string;
    score: number;
    feedback: string;
}

export interface Evaluation {
  score: number;
  feedback: string;
  isCorrect: boolean;
  topic: string;
  // Optional detailed feedback for subjective questions
  criteria?: CriterionFeedback[];
  strengths?: string[]; // Quotes from user's answer
  weaknesses?: string[]; // Quotes from user's answer
}

export interface ExamResult {
  questions: Question[];
  userAnswers: UserAnswer[];
  evaluations: Evaluation[];
  timeTaken: number;
  config: ExamConfig;
  timestamp: number;
}