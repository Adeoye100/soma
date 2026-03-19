import { supabase } from './supabase';
import type { ExamConfig, Material, Question, UserAnswer, Evaluation } from '../types';
import { ExamType, TimeIntensity, Difficulty } from '../types';

const MAX_CONTENT_CHARS = 50_000;


/**
 * Generate exam questions by calling the backend API
 */
export const generateExam = async (config: ExamConfig, materials: Material[]): Promise<Question[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const difficultyMap: Record<string, string> = {
    [Difficulty.BEGINNER]: 'easy',
    [Difficulty.INTERMEDIATE]: 'medium',
    [Difficulty.ADVANCED]: 'hard',
  };

  const materialsWithSafeContent = materials.map(m => {
    let safeContent = m.content;
    if (typeof safeContent === 'string' && safeContent.length > MAX_CONTENT_CHARS) {
      console.warn(`[ExamGen] Content for "${m.name}" truncated from ${safeContent.length} to ${MAX_CONTENT_CHARS} chars`);
      safeContent = safeContent.slice(0, MAX_CONTENT_CHARS);
    }
    return { content: safeContent };
  });

  const payload = {
    topics: config.topics,
    type: config.type.toUpperCase().replace(' ', '_'),
    difficulty: difficultyMap[config.difficulty] || 'medium',
    numQuestions: config.numQuestions,
    timeLimit: Math.floor((config.intensity === TimeIntensity.RELAXED ? 180 : config.intensity === TimeIntensity.MODERATE ? 90 : 45) * config.numQuestions / 60),
    materials: materialsWithSafeContent
  };

  const response = await fetch('/api/exam/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const throttleRemaining = response.headers.get('x-throttle-remaining');
  if (response.status === 429 || throttleRemaining === '0') {
    const resetTs = response.headers.get('x-throttle-reset');
    const resetDate = resetTs ? new Date(Number(resetTs) * 1000).toLocaleTimeString() : 'soon';
    throw new Error(`Too many requests. Please try again after ${resetDate}.`);
  }

  if (response.status === 400) {
    const errorBody = await response.json();
    console.error('[ExamGen] Validation error details:', errorBody);
    throw new Error(
      errorBody?.message ||
      errorBody?.errors?.map((e: unknown) => (e as { message: string }).message).join(', ') ||
      'Validation failed — check request body shape'
    );
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.questions;
};

/**
 * Evaluate a single answer by calling the backend API
 */
export const evaluateAnswer = async (question: Question, userAnswer: string): Promise<Evaluation> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/exam/evaluate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question: question.question,
      answer: userAnswer,
      options: question.options,
      correctAnswer: question.correctAnswer,
      topic: question.topic
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to evaluate answer');
  }

  const data = await response.json();
  return data.evaluation;
};