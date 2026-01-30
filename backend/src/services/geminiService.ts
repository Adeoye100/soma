import { GoogleGenAI, Type } from '@google/genai';
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

// 1. Read multiple API keys from environment variables
const apiKeys = config.geminiApiKeys;
if (apiKeys.length === 0) {
  throw new Error("No Gemini API key found. Please set GEMINI_API_KEYS in your environment variables.");
}

// 2. Manage the current key index
let currentKeyIndex = 0;

// 3. Create a function to get a client with the current key
function getAiClient() {
  const apiKey = apiKeys[currentKeyIndex];
  if (!apiKey) {
    throw new Error("All available Gemini API keys have been exhausted.");
  }
  return new GoogleGenAI({ apiKey });
}

function switchToNextKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  winston.warn(`[geminiService] Switched to next API key (index: ${currentKeyIndex}) due to rate limiting.`);
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

    // If we hit Server Error (503), and have retries left (429 retries disabled)
    if (response.status === 503 && retries > 0) {
      winston.warn(`Rate limit hit on API key ${localKeyIndex}. Retrying in ${backoff}ms... (${retries} retries left)`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, backoff));

      // Rotate to next API key if available
      const nextKeyIndex = (localKeyIndex + 1) % Math.max(apiKeys.length, 1);
      
      // Update global key index
      currentKeyIndex = nextKeyIndex;
      
      // Recursive call with decremented retries, doubled backoff time, and next API key
      return fetchWithBackoff(url, options, retries - 1, backoff * 2, nextKeyIndex);
    }

    // If it's a different error (e.g., 400 Bad Request), throw immediately
    const errorText = await response.text();
    throw new Error(`HTTP Error: ${response.status} - ${errorText}`);

  } catch (error) {
    // If it's a network error and we have retries left, retry with next API key
    if (retries > 0 && apiKeys.length > 1) {
      winston.warn(`Network error on API key ${localKeyIndex}. Retrying with next key... (${retries} retries left)`);
      const nextKeyIndex = (localKeyIndex + 1) % apiKeys.length;
      currentKeyIndex = nextKeyIndex;
      return fetchWithBackoff(url, options, retries - 1, backoff, nextKeyIndex);
    }
    throw error;
  }
}

/**
 * Raw fetch function for Gemini API with enhanced error handling
 */
async function fetchGeminiContent(
  model: string, 
  contents: any[], 
  config?: any,
  retries = 3,
  backoff = 1000
): Promise<any> {
  const apiKey = apiKeys[currentKeyIndex];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 2048,
      ...config?.generationConfig
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      ...(config?.safetySettings || [])
    ]
  };

  if (config?.responseMimeType) {
    requestBody.generationConfig.responseMimeType = config.responseMimeType;
  }
  
  if (config?.responseSchema) {
    requestBody.generationConfig.responseSchema = config.responseSchema;
  }

  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Smart-Examination-Backend/1.0"
    },
    body: JSON.stringify(requestBody)
  };

  try {
    const response = await fetchWithBackoff(url, options, retries, backoff);
    const data = await response.json() as any;

    if (data.error) {
      throw new Error(data.error?.message || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    winston.error(`Failed to fetch from Gemini API with key ${currentKeyIndex}:`, error);
    throw new AIServiceError(`Gemini API error: ${(error as Error).message}`, { apiKeyIndex: currentKeyIndex });
  }
}

// Supported MIME types for Gemini AI
const SUPPORTED_MIME_TYPES = new Set([
    'application/pdf',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/heic',
    'image/heif'
]);

const fileToGenerativePart = (content: string, mimeType: string) => {
    // Check if MIME type is supported by Gemini
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
        throw new AIServiceError(`File type ${mimeType} is not supported by the AI. Supported formats: PDF, Plain Text, and Images (PNG, JPG, WEBP, HEIC, HEIF). Please convert your PowerPoint files to PDF format for best results.`);
    }
    
    return {
        inlineData: {
            data: content,
            mimeType,
        },
    };
};

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
      - Adhere STRICTLY to the JSON output schema. Do not include any extra text or markdown formatting outside of the JSON structure.
    `;
};

/**
 * Enhanced wrapper function to call Gemini API with automatic key rotation,
 * exponential backoff, and comprehensive error handling.
 * @param apiCall A function that makes the actual API call.
 */
async function callGeminiWithRetry<T>(apiCall: (client: GoogleGenAI) => Promise<T>): Promise<T> {
  const initialKeyIndex = currentKeyIndex;
  let attempts = 0;
  const maxAttempts = apiKeys.length * 3; // Allow more attempts with backoff

  while (attempts < maxAttempts) {
    try {
      const client = getAiClient();
      return await apiCall(client);
    } catch (err: any) {
      // Enhanced error detection for rate limits and quota errors
      const isQuotaError = err.message?.includes('quota') || 
                          err.message?.includes('RESOURCE_EXHAUSTED') ||
                          err.message?.includes('billing') ||
                          err.message?.includes('limit');
      
      const isRateLimit = err.message?.includes('429') ||
                         err.message?.includes('rate limit') ||
                         err.message?.includes('too many requests');
      
      const isServerError = err.message?.includes('503') ||
                           err.message?.includes('500') ||
                           err.message?.includes('server error');
      
      const isNetworkError = err.name === 'TypeError' && 
                            (err.message?.includes('fetch') || 
                             err.message?.includes('network') ||
                             err.message?.includes('Failed to fetch'));

      if (isQuotaError || isRateLimit || isServerError || isNetworkError) {
        winston.warn(`[geminiService] Error detected for API key index ${currentKeyIndex}: ${err.message}`);
        
        if (apiKeys.length > 1) {
          switchToNextKey();
          attempts++;
          
          if (currentKeyIndex === initialKeyIndex) {
            // We've cycled through all keys
            throw new AIServiceError("All available Gemini API keys have been exhausted after retries. Please try again later or add new keys.");
          }
          
          // Add exponential backoff delay before next attempt
          const backoffDelay = Math.min(1000 * Math.pow(2, Math.floor(attempts / apiKeys.length)), 30000);
          winston.info(`[geminiService] Retrying with backoff ${backoffDelay}ms after ${attempts} attempts...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          
          continue;
        } else {
          // Only one key available, just retry with backoff
          attempts++;
          const backoffDelay = Math.min(1000 * Math.pow(2, attempts), 30000);
          winston.info(`[geminiService] Single key retry with backoff ${backoffDelay}ms after ${attempts} attempts...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
      } else {
        // Re-throw other errors immediately
        throw err;
      }
    }
  }

  // This point should not be reached if the loop is correct, but as a fallback:
  throw new AIServiceError("All available Gemini API keys have exceeded their quota after maximum retries.");
}

/**
 * Alternative direct API call using enhanced fetch with backoff
 * Use this for more control over request parameters
 */
async function callGeminiWithEnhancedFetch<T>(
  model: string,
  contents: any[],
  config?: any
): Promise<T> {
  const initialKeyIndex = currentKeyIndex;
  let attempts = 0;
  const maxAttempts = apiKeys.length * 3;

  while (attempts < maxAttempts) {
    try {
      return await fetchGeminiContent(model, contents, config, 2, 1000) as T;
    } catch (err: any) {
      const isQuotaError = err.message?.includes('quota') || 
                          err.message?.includes('RESOURCE_EXHAUSTED') ||
                          err.message?.includes('billing') ||
                          err.message?.includes('limit');
      
      const isRateLimit = err.message?.includes('rate limit') ||
                         err.message?.includes('too many requests');
      
      const isServerError = err.message?.includes('503') ||
                           err.message?.includes('500') ||
                           err.message?.includes('server error');

      if (isQuotaError || isRateLimit || isServerError) {
        winston.warn(`[geminiService] Enhanced fetch error for API key index ${currentKeyIndex}: ${err.message}`);
        
        if (apiKeys.length > 1 && currentKeyIndex !== initialKeyIndex) {
          attempts++;
          if (currentKeyIndex === initialKeyIndex) {
            throw new AIServiceError("All available Gemini API keys have been exhausted after enhanced fetch retries.");
          }
        } else {
          attempts++;
        }
        
        const backoffDelay = Math.min(1000 * Math.pow(2, attempts), 30000);
        winston.info(`[geminiService] Enhanced fetch retry with backoff ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      } else {
        throw err;
      }
    }
  }
  
  throw new AIServiceError("All enhanced fetch attempts exhausted.");
}

export const generateExam = async (config: ExamConfig, materials: Material[]): Promise<Question[]> => {
  return callGeminiWithRetry(async (ai) => {
      const model = ai.models;
      const contentParts = materials.map(m => fileToGenerativePart(m.content, m.mimeType));

      // Step 1: Extract Key Topics
      const topicExtractionPrompt = 'Analyze the following course materials and extract a concise list of key topics and concepts. Present this as a simple, comma-separated string.';
      const topicResponse = await model.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ parts: [...contentParts, { text: topicExtractionPrompt }] }]
      });

      const topics = topicResponse.text;
      if (!topics || topics.trim() === '') {
          throw new AIServiceError('Could not extract topics from the provided materials.');
      }

      // Step 2: Generate Exam Questions based on topics
      const examPrompt = getExamPrompt(config, topics);
      const questionSchema = {
          type: Type.OBJECT,
          properties: {
              question: { type: Type.STRING, description: 'The question text.' },
              options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'An array of 4 options for multiple-choice questions. Omit for other types.',
                  nullable: true,
              },
              correctAnswer: { type: Type.STRING, description: 'The correct answer. For essays/short answers, this is the model answer.' },
              topic: { type: Type.STRING, description: 'The primary topic this question covers.' }
          },
          required: ['question', 'correctAnswer', 'topic']
      };

      const examGenerationResponse = await model.generateContent({
          model: 'gemini-2.5-pro',
          contents: [{ parts: [{ text: examPrompt }] }],
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      questions: {
                          type: Type.ARRAY,
                          items: questionSchema
                      }
                  },
                  required: ['questions']
              }
          }
      });

      try {
          const jsonText = (examGenerationResponse as any)?.text?.trim() || '';
          const parsedResult = JSON.parse(jsonText);
          if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
              throw new Error("Invalid JSON structure received from API. Expected a 'questions' array.");
          }
          return parsedResult.questions as Question[];
      } catch (e) {
          winston.error("Failed to parse JSON response:", examGenerationResponse.text);
          throw new AIServiceError(`Error parsing exam questions: ${(e as Error).message}`);
      }
  });
};

/**
 * Enhanced exam generation using direct API calls with advanced error handling
 * Useful for scenarios requiring fine-grained control over requests
 */
export const generateExamEnhanced = async (config: ExamConfig, materials: Material[]): Promise<Question[]> => {
  const contentParts = materials.map(m => fileToGenerativePart(m.content, m.mimeType));

  // Step 1: Extract Key Topics using enhanced fetch
  const topicExtractionPrompt = 'Analyze the following course materials and extract a concise list of key topics and concepts. Present this as a simple, comma-separated string.';
  
  const topicResponse = await callGeminiWithEnhancedFetch(
    'gemini-2.0-flash',
    [{ parts: [...contentParts, { text: topicExtractionPrompt }] }]
  );

  const topics = (topicResponse as any).candidates?.[0]?.content?.parts?.[0]?.text;
  if (!topics || topics.trim() === '') {
      throw new AIServiceError('Could not extract topics from the provided materials.');
  }

  // Step 2: Generate Exam Questions based on topics
  const examPrompt = getExamPrompt(config, topics);
  const questionSchema = {
      type: Type.OBJECT,
      properties: {
          question: { type: Type.STRING, description: 'The question text.' },
          options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'An array of 4 options for multiple-choice questions. Omit for other types.',
              nullable: true,
          },
          correctAnswer: { type: Type.STRING, description: 'The correct answer. For essays/short answers, this is the model answer.' },
          topic: { type: Type.STRING, description: 'The primary topic this question covers.' }
      },
      required: ['question', 'correctAnswer', 'topic']
  };

  const examGenerationResponse = await callGeminiWithEnhancedFetch(
    'gemini-2.5-pro',
    [{ parts: [{ text: examPrompt }] }],
    {
      responseMimeType: "application/json",
      responseSchema: {
          type: Type.OBJECT,
          properties: {
              questions: {
                  type: Type.ARRAY,
                  items: questionSchema
              }
          },
          required: ['questions']
      }
    }
  );

  try {
      const jsonText = (examGenerationResponse as any).candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      const parsedResult = JSON.parse(jsonText);
      if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
          throw new Error("Invalid JSON structure received from API. Expected a 'questions' array.");
      }
      return parsedResult.questions as Question[];
  } catch (e) {
      winston.error("Failed to parse JSON response from enhanced fetch:", examGenerationResponse);
      throw new AIServiceError(`Error parsing exam questions: ${(e as Error).message}`);
  }
};

export const evaluateAnswer = async (question: Question, userAnswer: UserAnswer): Promise<EvaluationResult> => {
  return callGeminiWithRetry(async (ai) => {
      if (question.options) { // Objective Question
          const isCorrect = userAnswer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
          return {
              score: isCorrect ? 10 : 0,
              feedback: isCorrect ? 'Correct!' : `The correct answer is: ${question.correctAnswer}`,
              isCorrect: isCorrect,
              topic: question.topic,
          };
      }

      // Written Answer Evaluation
      const model = ai.models;
      const prompt = `
        You are an expert AI grader. Evaluate a student's answer based on the question and the model answer.

        **Question:** ${question.question}
        **Model Answer (for reference):** ${question.correctAnswer}
        **Student's Answer:** ${userAnswer.answer}

        **Task:**
        1.  Assess the student's answer for correctness, completeness, and clarity.
        2.  Provide concise, constructive feedback, highlighting strengths and areas for improvement.
        3.  Assign a score from 0 to 10, where 10 is a perfect answer.

        Respond STRICTLY in the following JSON format.
      `;

      const response = await model.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ parts: [{ text: prompt }] }],
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER, description: 'Score from 0-10' },
                    feedback: { type: Type.STRING, description: 'Constructive feedback for the student.' },
                    isCorrect: { type: Type.BOOLEAN, description: 'True if the answer is fundamentally correct (score >= 7).' }
                },
                required: ['score', 'feedback', 'isCorrect']
            }
          }
      });

      try {
          const jsonText = (response as any)?.text?.trim() || '';
          const parsedResult = JSON.parse(jsonText);
          return { ...parsedResult, topic: question.topic };
      } catch (e) {
          winston.error("Failed to parse evaluation response:", response.text);
          return {
              score: 0,
              feedback: 'Could not automatically evaluate this answer.',
              isCorrect: false,
              topic: question.topic,
          };
      }
  });
};

/**
 * Enhanced answer evaluation using direct API calls
 */
export const evaluateAnswerEnhanced = async (question: Question, userAnswer: UserAnswer): Promise<EvaluationResult> => {
  if (question.options) { // Objective Question
      const isCorrect = userAnswer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      return {
          score: isCorrect ? 10 : 0,
          feedback: isCorrect ? 'Correct!' : `The correct answer is: ${question.correctAnswer}`,
          isCorrect: isCorrect,
          topic: question.topic,
      };
  }

  // Written Answer Evaluation
  const prompt = `
    You are an expert AI grader. Evaluate a student's answer based on the question and the model answer.

    **Question:** ${question.question}
    **Model Answer (for reference):** ${question.correctAnswer}
    **Student's Answer:** ${userAnswer.answer}

    **Task:**
    1.  Assess the student's answer for correctness, completeness, and clarity.
    2.  Provide concise, constructive feedback, highlighting strengths and areas for improvement.
    3.  Assign a score from 0 to 10, where 10 is a perfect answer.

    Respond STRICTLY in the following JSON format.
  `;

  try {
    const response = await callGeminiWithEnhancedFetch(
      'gemini-2.0-flash',
      [{ parts: [{ text: prompt }] }],
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: 'Score from 0-10' },
            feedback: { type: Type.STRING, description: 'Constructive feedback for the student.' },
            isCorrect: { type: Type.BOOLEAN, description: 'True if the answer is fundamentally correct (score >= 7).' }
          },
          required: ['score', 'feedback', 'isCorrect']
        }
      }
    );

    const jsonText = (response as any).candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const parsedResult = JSON.parse(jsonText);
    return { ...parsedResult, topic: question.topic };
  } catch (e) {
    winston.error("Failed to parse enhanced evaluation response:", e);
    return {
        score: 0,
        feedback: 'Could not automatically evaluate this answer.',
        isCorrect: false,
        topic: question.topic,
    };
  }
};

/**
 * Utility function to get service status and API key information
 */
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

/**
 * Reset to first API key (useful for testing or manual reset)
 */
export const resetToFirstKey = () => {
  currentKeyIndex = 0;
  winston.info('[geminiService] Reset to first API key');
};

/**
 * Get the next API key without making a request (useful for testing key rotation)
 */
export const getNextKey = () => {
  const nextIndex = (currentKeyIndex + 1) % apiKeys.length;
  return {
    current: { index: currentKeyIndex, key: apiKeys[currentKeyIndex]?.substring(0, 8) + '...' },
    next: { index: nextIndex, key: apiKeys[nextIndex]?.substring(0, 8) + '...' }
  };
};

export default {
  generateExam,
  generateExamEnhanced,
  evaluateAnswer,
  evaluateAnswerEnhanced,
  getServiceStatus,
  resetToFirstKey,
  getNextKey
};