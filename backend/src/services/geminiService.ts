import { config } from '@/config';
import { AIServiceError } from '@/middleware/errorHandler';
import winston from 'winston';

// Types
export interface ExamConfig {
  subject?: string;
  type: 'OBJECTIVE' | 'SHORT_ANSWER' | 'ESSAY' | 'TRUE_FALSE';
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
  timeLimit?: number;
}

export interface Material {
  content: string;
  mimeType: string;
  title?: string;
}

export interface Question {
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
  topic: string;
  order_index: number;
  points: number;
  subject: string;
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
    top_p: 0.95,
    max_tokens: 8192,
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

const buildExamPrompt = (
  extractedText: string,
  config: {
    subject:      string
    type:         string
    difficulty:   string
    numQuestions: number
    timeLimit?:   number
  }
): string => {

  const typeInstructions = {
    OBJECTIVE: `
      Generate multiple-choice questions with 
      EXACTLY 4 options labeled as full sentences 
      or phrases — NOT single letters or generic 
      placeholders like "Option A".
      
      Rules for options:
      - Each option must be a complete, meaningful 
        answer drawn from the study material
      - Exactly ONE option must be correct
      - The other THREE must be plausible but 
        clearly wrong to someone who studied the material
      - Wrong options should be common misconceptions 
        or related-but-incorrect facts from the material
      - Options must be DIFFERENT lengths and structures
        — not symmetrically formatted
      - NEVER use: "All of the above", "None of the above",
        "Both A and B" — these are lazy options`,

    SHORT_ANSWER: `
      Generate questions that require a 1-3 sentence
      written answer. The correct_answer field must
      contain a MODEL ANSWER that demonstrates what
      a full-marks response looks like.
      
      The options array must be empty: []
      
      The correct_answer must include:
      - The key concept that must be mentioned
      - Acceptable alternative phrasings
      Format: "Key answer: [answer]. Also acceptable: [alternatives]"`,

    ESSAY: `
      Generate questions that require extended written
      responses (3-5 paragraphs). The correct_answer
      field must contain an ASSESSMENT RUBRIC showing:
      - What earns full marks (5 points)
      - What earns partial marks (3 points)
      - What earns minimum marks (1 point)
      
      The options array must be empty: []`,

    TRUE_FALSE: `
      Generate statements that are either definitively
      TRUE or definitively FALSE based on the material.
      
      Rules:
      - The statement must be directly verifiable from 
        the study material
      - options must be exactly: ["True", "False"]
      - correct_answer must be exactly: "True" or "False"
      - Avoid ambiguous statements that could be argued
        either way`
  }

  const difficultyInstructions = {
    easy: `
      EASY difficulty — Test RECALL and RECOGNITION:
      - Ask about specific facts, definitions, names,
        dates, or sequences directly stated in the text
      - The answer should be findable by someone who
        read the material once
      - Example verbs: Define, Identify, List, Name,
        State, Recall, Recognise`,

    medium: `
      MEDIUM difficulty — Test UNDERSTANDING and APPLICATION:
      - Ask students to explain WHY or HOW something works
      - Require application of a concept to a new scenario
      - The answer requires comprehension, not just recall
      - Example verbs: Explain, Compare, Calculate, Apply,
        Interpret, Classify, Summarise`,

    hard: `
      HARD difficulty — Test ANALYSIS and EVALUATION:
      - Ask students to analyse relationships between concepts
      - Require synthesis of multiple ideas from the material
      - Question should challenge students who studied deeply
      - Example verbs: Analyse, Evaluate, Critique, Design,
        Justify, Predict, Differentiate, Assess`
  }

  const typeConfig = config.type === 'TRUE_FALSE' ? 'TRUE_FALSE' 
                   : config.type === 'SHORT_ANSWER' ? 'SHORT_ANSWER'
                   : config.type === 'ESSAY' ? 'ESSAY'
                   : 'OBJECTIVE';

  return `
You are a world-class university examiner with expert 
knowledge in: ${config.subject || 'the subject of the provided material'}.

Your task is to generate ${config.numQuestions} examination 
questions that test a student's understanding of the 
SPECIFIC CONTENT in the study material below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDY MATERIAL (READ CAREFULLY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${extractedText.slice(0, 12000)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAM CONFIGURATION:
  Subject:          ${config.subject || 'As determined by material'}
  Question Type:    ${config.type}
  Difficulty Level: ${config.difficulty}
  Total Questions:  ${config.numQuestions}
  ${config.timeLimit ? `Time Limit: ${config.timeLimit} minutes` : ''}

QUESTION TYPE RULES:
${typeInstructions[typeConfig]}

DIFFICULTY RULES:
${difficultyInstructions[config.difficulty as keyof typeof difficultyInstructions]
|| difficultyInstructions.medium}

CONTENT ANCHORING RULES (CRITICAL):
  1. EVERY question must reference a SPECIFIC concept,
     fact, term, person, process, date, formula, or
     event that appears in the study material above
  
  2. If you cannot trace a question back to a specific
     passage in the study material — DO NOT generate it
  
  3. Quote or paraphrase terms from the material in
     your questions to make the source obvious
  
  4. Questions must NOT be answerable from general
     knowledge alone — they must require the material

QUALITY RULES:
  1. No two questions should test the same concept
  2. Questions must be clearly worded — no ambiguity
  3. Each question must have exactly ONE defensible answer
  4. Distribute questions across different sections of
     the material — do not cluster at the beginning
  5. If ${config.numQuestions} unique questions cannot
     be generated from the material, generate as many
     as possible and note the limitation

SCORING:
  Easy questions:   1 point each
  Medium questions: 2 points each
  Hard questions:   3 points each

OUTPUT FORMAT — RETURN ONLY THIS JSON:
No markdown. No explanation. No preamble. No backticks.
Return ONLY a valid JSON array starting with [ and ending with ].

[
  {
    "question_text":   "The full question text here — specific to the material",
    "question_type":   "${config.type}",
    "options":         ["First complete option text", "Second complete option text", "Third complete option text", "Fourth complete option text"],
    "correct_answer":  "The exact text of the correct option (must match one of the options exactly)",
    "explanation":     "Explain why this answer is correct, referencing the specific part of the material. Also explain why common wrong answers are incorrect.",
    "difficulty":      "${config.difficulty}",
    "topic":           "The specific topic or section from the material this question covers",
    "order_index":     1,
    "points":          ${config.difficulty === 'hard' ? 3 : config.difficulty === 'medium' ? 2 : 1},
    "subject":         "${config.subject || ''}"
  }
]

REMINDER: Return ONLY the JSON array.
First character must be [
Last character must be ]
Every string must use double quotes.
No trailing commas.
No comments inside the JSON.`
}

function parseGeminiResponse(
  rawText: string,
  config: { type: string; subject: string; difficulty: string }
): Question[] {

  // Step 1 — Clean the raw text
  let cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .replace(/^\s*Here(?:'s| are| is)[^[]*(\[)/s, '$1')
    .replace(/\]\s*[^[\]]*$/s, ']')
    .trim()

  // Step 2 — Find the JSON array boundaries
  const startIndex = cleaned.indexOf('[')
  const endIndex   = cleaned.lastIndexOf(']')

  if (startIndex === -1 || endIndex === -1 
      || startIndex >= endIndex) {
    throw new Error(
      `Gemini response contained no valid JSON array.\n` +
      `Raw response preview: ${rawText.slice(0, 500)}`
    )
  }

  const jsonStr = cleaned.slice(startIndex, endIndex + 1)

  // Step 3 — Parse the JSON
  let questions: any[]
  try {
    questions = JSON.parse(jsonStr)
  } catch (parseError: any) {
    // Attempt to fix common JSON issues
    const fixed = jsonStr
      .replace(/,\s*]/g, ']')           // trailing commas
      .replace(/,\s*}/g, '}')           // trailing commas in objects
      .replace(/(['"])?([a-zA-Z_]+)(['"])?\s*:/g, '"$2":') // unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"') // single quoted values

    try {
      questions = JSON.parse(fixed)
    } catch {
      throw new Error(
        `Failed to parse Gemini JSON response.\n` +
        `Parse error: ${parseError.message}\n` +
        `JSON preview: ${jsonStr.slice(0, 500)}`
      )
    }
  }

  // Step 4 — Validate and sanitise each question
  // THIS IS WHERE FALLBACKS MUST BE ELIMINATED
  return questions.map((q: any, index: number) => {

    // ── question_text ────────────────────────
    const questionText = typeof q.question_text === 'string'
      ? q.question_text.trim()
      : typeof q.question === 'string'
        ? q.question.trim()
        : null

    // HARD FAIL — never use a fallback question text
    if (!questionText || questionText.length < 10) {
      throw new Error(
        `Question ${index + 1} has invalid question_text: ` +
        `"${questionText}". AI response must provide real questions.`
      )
    }

    // ── options ──────────────────────────────
    let options: string[] = []

    if (config.type === 'OBJECTIVE' || 
        config.type === 'TRUE_FALSE') {
      
      // Extract options from AI response
      const rawOptions = Array.isArray(q.options) 
        ? q.options 
        : Array.isArray(q.choices) 
          ? q.choices
          : null

      // HARD FAIL — never use generic fallback options
      if (!rawOptions || rawOptions.length < 2) {
        throw new Error(
          `Question ${index + 1} "${questionText.slice(0,50)}..." ` +
          `has no options from AI. ` +
          `Received: ${JSON.stringify(q.options)}`
        )
      }

      // Validate each option is a real string
      options = rawOptions.map((opt: any, optIdx: number) => {
        const optText = typeof opt === 'string'
          ? opt.trim()
          : typeof opt === 'object' && opt.text
            ? String(opt.text).trim()
            : typeof opt === 'object' && opt.value
              ? String(opt.value).trim()
              : null

        if (!optText || optText.length < 1) {
          throw new Error(
            `Question ${index + 1}, option ${optIdx + 1} ` +
            `is empty or invalid: ${JSON.stringify(opt)}`
          )
        }

        // REJECT generic placeholder options
        const genericPatterns = [
          /^option [a-d]$/i,
          /^answer [a-d]$/i,
          /^choice [a-d]$/i,
          /^[a-d]\)?\s*$/i,
          /^placeholder/i,
          /^sample answer/i,
          /^example/i,
          /^\[.*\]$/ // [Option Text]
        ]

        if (genericPatterns.some(p => p.test(optText))) {
          throw new Error(
            `Question ${index + 1} contains generic placeholder ` +
            `option: "${optText}". ` +
            `AI must generate real content-specific options.`
          )
        }

        return optText
      })

      // OBJECTIVE must have 4 options
      if (config.type === 'OBJECTIVE' && options.length < 4) {
        throw new Error(
          `Question ${index + 1} has only ${options.length} options. ` +
          `OBJECTIVE questions require exactly 4.`
        )
      }

      // TRUE_FALSE must have exactly 2 options
      if (config.type === 'TRUE_FALSE' && options.length !== 2) {
        options = ['True', 'False'] // Only acceptable hardcode
      }
    }

    // ── correct_answer ───────────────────────
    const correctAnswer = typeof q.correct_answer === 'string'
      ? q.correct_answer.trim()
      : typeof q.answer === 'string'
        ? q.answer.trim()
        : null

    if (!correctAnswer || correctAnswer.length < 1) {
      throw new Error(
        `Question ${index + 1} has no correct_answer from AI.`
      )
    }

    // For OBJECTIVE: correct_answer must match one of the options
    if (config.type === 'OBJECTIVE' && options.length > 0) {
      const exactMatch = options.includes(correctAnswer)
      const caseMatch  = options.some(
        o => o.toLowerCase() === correctAnswer.toLowerCase()
      )

      if (!exactMatch && !caseMatch) {
        // Log warning but don't throw — use first option as fallback
        winston.warn(
          `[parseGemini] Q${index+1}: correct_answer "${correctAnswer}" ` +
          `does not match any option. Options: ${JSON.stringify(options)}`
        )
        // Try to find best match
        const partialMatch = options.find(o =>
          o.toLowerCase().includes(correctAnswer.toLowerCase()) ||
          correctAnswer.toLowerCase().includes(o.toLowerCase())
        )
        if (!partialMatch) {
          winston.error(
            `[parseGemini] Q${index+1}: Cannot match correct_answer ` +
            `to any option — keeping as-is.`
          )
        }
      }
    }

    return {
      question_text:  questionText,
      question_type:  config.type,
      options,
      correct_answer: correctAnswer,
      explanation:    typeof q.explanation === 'string'
                        ? q.explanation.trim()
                        : '',
      difficulty:     ['easy','medium','hard']
                        .includes(q.difficulty)
                        ? q.difficulty
                        : config.difficulty,
      topic:          typeof q.topic === 'string'
                        ? q.topic.trim()
                        : config.subject || 'General',
      order_index:    typeof q.order_index === 'number'
                        ? Math.max(0, q.order_index)
                        : index,
      points:         typeof q.points === 'number'
                        ? Math.max(0, q.points)
                        : config.difficulty === 'hard' ? 3
                        : config.difficulty === 'medium' ? 2
                        : 1,
      subject:        typeof q.subject === 'string'
                        ? q.subject
                        : config.subject || ''
    }
  })
}

async function generateWithRetry(
  prompt: string,
  maxRetries = 2
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callOpenRouter([
        { role: 'system', content: 'You are an expert exam generator. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ], { type: 'json_object' });
      
      const text = response.choices?.[0]?.message?.content || '';

      // Quick sanity check before returning
      if (!text.includes('[') || !text.includes(']')) {
        throw new Error(
          `Response does not contain a JSON array. ` +
          `Preview: ${text.slice(0, 200)}`
        )
      }

      return text
    } catch (err: any) {
      lastError = err
      winston.warn(
        `[Gemini] Attempt ${attempt} failed: ${err.message}`
      )

      if (attempt < maxRetries) {
        // On retry, append stricter instruction
        prompt += `\n\nCRITICAL: Your previous response was invalid JSON. Return ONLY the JSON array. No other text. Start with [ and end with ].`
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }
  }

  throw new Error(
    `Gemini failed after ${maxRetries} attempts. ` +
    `Last error: ${lastError?.message}`
  )
}

export const generateExam = async (config: ExamConfig, materials: Material[]): Promise<Question[]> => {
  const extractedText = materials.map(m => m.content).join('\n\n');

  const prompt = buildExamPrompt(extractedText, {
    subject: config.subject || '',
    type: config.type,
    difficulty: config.difficulty,
    numQuestions: config.numQuestions,
    ...(config.timeLimit !== undefined && { timeLimit: config.timeLimit })
  })

  const rawText = await generateWithRetry(prompt);
  
  winston.info('[exam/generate] Gemini raw response preview: ' + rawText.slice(0, 500));

  return parseGeminiResponse(rawText, {
    type: config.type,
    subject: config.subject || 'General',
    difficulty: config.difficulty
  });
};

export const generateExamEnhanced = generateExam;

export const evaluateAnswer = async (question: Question, userAnswer: UserAnswer): Promise<EvaluationResult> => {
  if (question.options && question.options.length > 0) { // Objective Question
      const isCorrect = userAnswer.answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
      return {
          score: isCorrect ? 10 : 0,
          feedback: isCorrect ? 'Correct!' : `The correct answer is: ${question.correct_answer}`,
          isCorrect: isCorrect,
          topic: question.topic,
      };
  }

  const prompt = `
    You are an expert AI grader. Evaluate a student's answer based on the question and the model answer.

    **Question:** ${question.question_text}
    **Model Answer (for reference):** ${question.correct_answer}
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
