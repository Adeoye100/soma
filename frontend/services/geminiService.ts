import { supabase } from './supabase';
import type { ExamConfig, Material, Question, UserAnswer, Evaluation } from '../types';
import { ExamType } from '../types';


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

  const response = await fetch('/api/exam/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...config,
      materials
    })
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

