import { supabase } from './supabase';
import type { ExamConfig, Material, Question, UserAnswer, Evaluation } from '../types';
import { ExamType, TimeIntensity } from '../types';


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

  const payload = {
    title: config.title,
    type: config.type.toUpperCase().replace(' ', '_'),
    difficulty: config.difficulty.toLowerCase(),
    numQuestions: config.numQuestions,
    timeLimit: Math.floor((config.intensity === TimeIntensity.RELAXED ? 180 : config.intensity === TimeIntensity.MODERATE ? 90 : 45) * config.numQuestions / 60),
    materials: materials.map(m => ({
      content: m.content,
      mimeType: m.mimeType
    }))
  };

  const response = await fetch('/api/exam/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to generate exam');
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

