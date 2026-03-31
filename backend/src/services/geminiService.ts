import { config } from '@/config';
import { AIServiceError } from '@/middleware/errorHandler';
import winston from 'winston';

// Types
export interface ExamConfig {
  type: 'OBJECTIVE' | 'SHORT_ANSWER' | 'ESSAY';
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
}

export interface Material {
  content: string;
  mimeType: string;
  title?: string;
}

export interface Question {
  question: string;
  options?: string[];
  correctAnswer: string;
  topic: string;
}

export interface UserAnswer {
  answer: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
  topic: string;
}

// 1. Read multiple OpenRouter API keys from environment variables
const apiKeys = config.openRouterApiKeys;
if (apiKeys.length === 0) {
  throw new Error("No OpenRouter API key found. Please set OPENROUTER_API_KEYS in your environment variables.");
}

// 2. Manage the current key index
let currentKeyIndex = 0;

function switchToNextKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  winston.warn(`[geminiService] Switched to next API key (index: ${currentKeyIndex}) due to rate limiting or error.`);
}

/**
 * Enhanced fetch function with exponential backoff and API key rotation
 * for handling 429 Rate Limits and network errors.
 */
async function fetchWithBackoff(
  url: string, 
  options: RequestInit, 
  retries = 3, 
  backoff = 1000, 
  currentKeyIndexParam = 0
): Promise<Response> {
  const localKeyIndex = currentKeyIndexParam;
  
  try {
    const response = await fetch(url, options);

    // If successful, return the response immediately
    if (response.ok) {
      return response;
    }

    // Handle Rate Limits (429) or Server Errors (503/500)
    if ((response.status === 429 || response.status >= 500) && retries > 0) {
      winston.warn(`Error ${response.status} on API key ${localKeyIndex}. Retrying in ${backoff}ms... (${retries} retries left)`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, backoff));

      // Rotate to next API key if available
      const nextKeyIndex = (localKeyIndex + 1) % Math.max(apiKeys.length, 1);
      
      // Update global key index
      currentKeyIndex = nextKeyIndex;
      
      // Update headers with new API key
      const newOptions = { ...options };
      if (newOptions.headers) {
        (newOptions.headers as any)['Authorization'] = `Bearer ${apiKeys[nextKeyIndex]}`;
      }
      
      // Recursive call with decremented retries, doubled backoff time, and next API key
      return fetchWithBackoff(url, newOptions, retries - 1, backoff * 2, nextKeyIndex);
    }

    // If it's a different error, throw immediately
    const errorText = await response.text();
    throw new Error(`HTTP Error: ${response.status} - ${errorText}`);

  } catch (error) {
    // If it's a network error and we have retries left, retry with next API key
    if (retries > 0 && apiKeys.length > 1) {
      winston.warn(`Network error on API key ${localKeyIndex}. Retrying with next key... (${retries} retries left)`);
      const nextKeyIndex = (localKeyIndex + 1) % apiKeys.length;
      currentKeyIndex = nextKeyIndex;
      
      const newOptions = { ...options };
      if (newOptions.headers) {
        (newOptions.headers as any)['Authorization'] = `Bearer ${apiKeys[nextKeyIndex]}`;
      }
      
      return fetchWithBackoff(url, newOptions, retries - 1, backoff, nextKeyIndex);
    }
    throw error;
  }
}

/**
 * Call OpenRouter API with enhanced error handling
 */
async function callOpenRouter(
  messages: any[],
  responseFormat?: { type: 'json_object' }
): Promise<any> {
  const apiKey = apiKeys[currentKeyIndex];
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const requestBody: any = {
    model: config.openRouterModel,
    messages,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2048,
  };

  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://smart-examination.app", // Optional, for OpenRouter rankings
      "X-Title": "Smart Examination App", // Optional, for OpenRouter rankings
    },
    body: JSON.stringify(requestBody)
  };

  try {
    const response = await fetchWithBackoff(url, options);
    const data = await response.json() as any;

    if (data.error) {
      throw new Error(data.error?.message || `API Error`);
    }

    return data;
  } catch (error) {
    winston.error(`Failed to fetch from OpenRouter with key ${currentKeyIndex}:`, error);
    throw new AIServiceError(`AI Service error: ${(error as Error).message}`, { apiKeyIndex: currentKeyIndex });
  }
}

const getExamPrompt = (config: ExamConfig, topics: string): string => {
    let questionFormatDetails = '';
    switch (config.type) {
        case 'OBJECTIVE':
            questionFormatDetails = 'Each question should be multiple-choice with exactly 4 options. Clearly indicate the single correct answer.';
            break;
        case 'SHORT_ANSWER':
            questionFormatDetails = 'Each question should require a concise answer, typically one or two sentences. Provide a model correct answer for evaluation purposes.';
            break;
        case 'ESSAY':
            questionFormatDetails = 'Each question should be open-ended, requiring a detailed, multi-paragraph response. Provide a comprehensive model answer covering key points for evaluation.';
            break;
    }

    return `
      You are an expert curriculum designer. Based on the following key topics, create a high-quality exam.

      **Key Topics:**
      ${topics}

      **Exam Specifications:**
      - **Type:** ${config.type}
      - **Difficulty:** ${config.difficulty}
      - **Number of Questions:** ${config.numQuestions}

      **Instructions:**
      - Generate exactly ${config.numQuestions} questions.
      - Ensure questions are relevant to the provided topics and match the specified difficulty level.
      - ${questionFormatDetails}
      - For each question, identify the main 'topic' it covers from the key topics list.
      - Respond ONLY with a JSON object containing a "questions" array.
      - Each question object must have: "question", "correctAnswer", "topic", and (if OBJECTIVE) "options" (array of 4 strings).
    `;
};

export const generateExam = async (config: ExamConfig, materials: Material[]): Promise<Question[]> => {
  const materialsContent = materials.map(m => m.content).join('\n\n');
  
  const topicExtractionPrompt = 'Analyze the following course materials and extract a concise list of key topics and concepts. Present this as a simple, comma-separated string.';
  const topicResponse = await callOpenRouter([
    { role: 'system', content: 'You are a helpful assistant that extracts topics from materials.' },
    { role: 'user', content: `${topicExtractionPrompt}\n\nMaterials:\n${materialsContent.substring(0, 10000)}` }
  ]);

  const topics = topicResponse.choices?.[0]?.message?.content;
  if (!topics || topics.trim() === '') {
      throw new AIServiceError('Could not extract topics from the provided materials.');
  }

  const examPrompt = getExamPrompt(config, topics);
  const examResponse = await callOpenRouter([
    { role: 'system', content: 'You are an expert exam generator. Output only valid JSON.' },
    { role: 'user', content: examPrompt }
  ], { type: 'json_object' });

  try {
      const jsonText = examResponse.choices?.[0]?.message?.content?.trim() || '';
      const parsedResult = JSON.parse(jsonText);
      if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
          throw new Error("Invalid JSON structure received. Expected a 'questions' array.");
      }

      // Normalize each question object — never trust AI response fields directly
      const questions: Question[] = parsedResult.questions.map((q: any, i: number) => {
        if (!q || typeof q !== 'object') {
          throw new Error(`Question at index ${i} is not a valid object`);
        }

        const questionText = String(q.question || q.question_text || '').trim();
        if (questionText.length < 5) {
          throw new Error(`Question at index ${i}: text too short (got ${questionText.length} chars, minimum is 5)`);
        }

        const correctAnswer = String(q.correctAnswer || q.correct_answer || '').trim();
        if (!correctAnswer) {
          throw new Error(`Question at index ${i}: missing correctAnswer`);
        }

        const topic = String(q.topic || 'General').trim();

        let options: string[] | undefined;
        if (Array.isArray(q.options)) {
          options = q.options.map((o: any) => String(o));
        }

        return {
          question: questionText,
          correctAnswer,
          topic,
          options
        };
      });

      return questions;
  } catch (e) {
      winston.error("Failed to parse JSON response:", examResponse.choices?.[0]?.message?.content);
      throw new AIServiceError(`Error parsing exam questions: ${(e as Error).message}`);
  }
};

export const generateExamEnhanced = generateExam;

export const evaluateAnswer = async (question: Question, userAnswer: UserAnswer): Promise<EvaluationResult> => {
  if (question.options) { // Objective Question
      const isCorrect = userAnswer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      return {
          score: isCorrect ? 10 : 0,
          feedback: isCorrect ? 'Correct!' : `The correct answer is: ${question.correctAnswer}`,
          isCorrect: isCorrect,
          topic: question.topic,
      };
  }

  const prompt = `
    You are an expert AI grader. Evaluate a student's answer based on the question and the model answer.

    **Question:** ${question.question}
    **Model Answer (for reference):** ${question.correctAnswer}
    **Student's Answer:** ${userAnswer.answer}

    **Task:**
    1.  Assess the student's answer for correctness, completeness, and clarity.
    2.  Provide concise, constructive feedback, highlighting strengths and areas for improvement.
    3.  Assign a score from 0 to 10, where 10 is a perfect answer.

    Respond STRICTLY in the following JSON format:
    {
      "score": number,
      "feedback": "string",
      "isCorrect": boolean
    }
  `;

  try {
    const response = await callOpenRouter([
      { role: 'system', content: 'You are an expert AI grader. Output only valid JSON.' },
      { role: 'user', content: prompt }
    ], { type: 'json_object' });

    const jsonText = response.choices?.[0]?.message?.content?.trim();
    const parsedResult = JSON.parse(jsonText);
    return { ...parsedResult, topic: question.topic };
  } catch (e) {
    winston.error("Failed to parse evaluation response:", e);
    return {
        score: 0,
        feedback: 'Could not automatically evaluate this answer.',
        isCorrect: false,
        topic: question.topic,
    };
  }
};

export const evaluateAnswerEnhanced = evaluateAnswer;

export const getServiceStatus = () => {
  return {
    totalKeys: apiKeys.length,
    currentKeyIndex,
    availableKeys: apiKeys.map((_, index) => ({
      index,
      isActive: index === currentKeyIndex,
      prefix: apiKeys[index]?.substring(0, 8) + '...'
    })),
    timestamp: new Date().toISOString()
  };
};

export const resetToFirstKey = () => {
  currentKeyIndex = 0;
  winston.info('[geminiService] Reset to first API key');
};

export const getNextKey = () => {
  const nextIndex = (currentKeyIndex + 1) % apiKeys.length;
  return {
    current: { index: currentKeyIndex, key: apiKeys[currentKeyIndex]?.substring(0, 8) + '...' },
    next: { index: nextIndex, key: apiKeys[nextIndex]?.substring(0, 8) + '...' }
  };
};

export class GeminiService {
  public async generateExam(config: ExamConfig, materials: Material[]): Promise<Question[]> {
    return generateExam(config, materials);
  }

  public async generateExamEnhanced(config: ExamConfig, materials: Material[]): Promise<Question[]> {
    return generateExamEnhanced(config, materials);
  }

  public async evaluateAnswer(question: Question, userAnswer: UserAnswer): Promise<EvaluationResult> {
    return evaluateAnswer(question, userAnswer);
  }

  public async evaluateAnswerEnhanced(question: Question, userAnswer: UserAnswer): Promise<EvaluationResult> {
    return evaluateAnswerEnhanced(question, userAnswer);
  }

  public getServiceStatus() {
    return getServiceStatus();
  }
}

export default {
  generateExam,
  generateExamEnhanced,
  evaluateAnswer,
  evaluateAnswerEnhanced,
  getServiceStatus,
  resetToFirstKey,
  getNextKey
};