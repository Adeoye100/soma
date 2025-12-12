import { GoogleGenAI, Type } from "@google/genai";
import type { ExamConfig, Material, Question, UserAnswer } from '../types';
import { ExamType } from '../types';
import { isQuotaError } from './utils';

// 1. Read multiple API keys from environment variables
const apiKeys = (process.env.GEMINI_API_KEYS || process.env.API_KEY || '').split(',').filter(k => k.trim());
if (apiKeys.length === 0) {
  throw new Error("No Gemini API key found. Please set GEMINI_API_KEYS or API_KEY in your environment variables.");
}

// 2. Manage the current key index
let currentKeyIndex = 0;

// 3. Create a function to get a client with the current key
function getAiClient() {
  const apiKey = apiKeys[currentKeyIndex];
  if (!apiKey) {
    // This should not happen if we handle the retries correctly
    throw new Error("All available Gemini API keys have been exhausted.");
  }
  return new GoogleGenAI({ apiKey });
}

function switchToNextKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.warn(`[geminiService] Switched to next API key (index: ${currentKeyIndex}) due to rate limiting.`);
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
        throw new Error(`File type ${mimeType} is not supported by the AI. Supported formats: PDF, Plain Text, and Images (PNG, JPG, WEBP, HEIC, HEIF). Please convert your PowerPoint files to PDF format for best results.`);
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
        case ExamType.OBJECTIVE:
            questionFormatDetails = 'Each question should be multiple-choice with exactly 4 options. Clearly indicate the single correct answer.';
            break;
        case ExamType.SHORT_ANSWER:
            questionFormatDetails = 'Each question should require a concise answer, typically one or two sentences. Provide a model correct answer for evaluation purposes.';
            break;
        case ExamType.ESSAY:
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
 * A wrapper function to call Gemini API with automatic key rotation on quota errors.
 * @param apiCall A function that makes the actual API call.
 */
async function callGeminiWithRetry<T>(apiCall: (client: GoogleGenAI) => Promise<T>): Promise<T> {
  const initialKeyIndex = currentKeyIndex;
  let attempts = 0;

  while (attempts < apiKeys.length) {
    try {
      const client = getAiClient();
      return await apiCall(client);
    } catch (err: any) {
      if (isQuotaError(err)) {
        console.warn(`[geminiService] Quota exceeded for API key index ${currentKeyIndex}.`);
        switchToNextKey();
        attempts++;
        if (currentKeyIndex === initialKeyIndex) {
          // We've cycled through all keys and are back to the start
          throw new Error("All available Gemini API keys have exceeded their quota. Please try again later or add new keys.");
        }
      } else {
        // Re-throw other errors immediately
        throw err;
      }
    }
  }

  // This point should not be reached if the loop is correct, but as a fallback:
  throw new Error("All available Gemini API keys have exceeded their quota.");
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
          throw new Error('Could not extract topics from the provided materials.');
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
          const jsonText = examGenerationResponse.text.trim();
          const parsedResult = JSON.parse(jsonText);
          if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
              throw new Error("Invalid JSON structure received from API. Expected a 'questions' array.");
          }
          return parsedResult.questions as Question[];
      } catch (e) {
          console.error("Failed to parse JSON response:", examGenerationResponse.text);
          throw new Error(`Error parsing exam questions: ${(e as Error).message}`);
      }
  });
};

export const evaluateAnswer = async (question: Question, userAnswer: UserAnswer) => {
  return callGeminiWithRetry(async (ai) => {
      if (question.options) { // Objective Question
          const isCorrect = userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
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
        **Student's Answer:** ${userAnswer}

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
          const jsonText = response.text.trim();
          const parsedResult = JSON.parse(jsonText);
          return { ...parsedResult, topic: question.topic };
      } catch (e) {
          console.error("Failed to parse evaluation response:", response.text);
          return {
              score: 0,
              feedback: 'Could not automatically evaluate this answer.',
              isCorrect: false,
              topic: question.topic,
          };
      }
  });
};
