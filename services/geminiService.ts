import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExamConfig, Material, Question, UserAnswer, ExamType, QuestionType, Evaluation, PracticeConfig } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });

const fileToGenerativePart = (content: string, mimeType: string) => {
    return {
        inlineData: {
            data: content,
            mimeType,
        },
    };
};

export const extractTopics = async (materials: Material[]): Promise<string[]> => {
    if (materials.length === 0) return [];
    const contentParts = materials.map(m => fileToGenerativePart(m.content, m.mimeType));
    const prompt = 'Analyze the following course materials and extract a concise list of key topics and concepts. Respond STRICTLY in the following JSON format: `{"topics": ["topic1", "topic2", ...]}`';

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [...contentParts, { text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    topics: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ['topics']
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);
        if (!parsedResult.topics || !Array.isArray(parsedResult.topics)) {
            throw new Error("Invalid JSON structure for topics received from API.");
        }
        return parsedResult.topics as string[];
    } catch (e) {
        console.error("Failed to parse topics from response:", response.text);
        throw new Error(`Error parsing topics: ${(e as Error).message}`);
    }
};

const getExamPrompt = (config: ExamConfig, topics: string): string => {
    let questionFormatDetails = '';
    switch (config.type) {
        case ExamType.MULTIPLE_CHOICE:
            questionFormatDetails = 'Each question must be multiple-choice with exactly 4 options. Indicate the single correct answer in `correctAnswer`.';
            break;
        case ExamType.TRUE_FALSE:
            questionFormatDetails = 'Each question must be a statement that is either true or false. The `correctAnswer` must be either "True" or "False".';
            break;
        case ExamType.FILL_IN_THE_BLANK:
            questionFormatDetails = 'Each question must be a sentence with one or more blanks represented by "___". Provide the correct words for the blanks in the `correctAnswers` array, in order.';
            break;
        case ExamType.MATCHING:
            questionFormatDetails = 'Each question should be a set of matching pairs. Provide the list of prompts and corresponding answers in the `matchingPairs` field. The `question` field should be an instruction like "Match the terms to their definitions."';
            break;
        case ExamType.SHORT_ANSWER:
            questionFormatDetails = 'Each question should require a concise answer, typically one or two sentences. Provide a model correct answer in `correctAnswer` for evaluation purposes.';
            break;
        case ExamType.ESSAY:
            questionFormatDetails = 'Each question should be open-ended, requiring a detailed, multi-paragraph response. Provide a comprehensive model answer in `correctAnswer` covering key points for evaluation.';
            break;
        case ExamType.MIXED:
            questionFormatDetails = `Generate a mix of question types including Multiple Choice, True/False, Fill-in-the-Blank, and Short Answer. Follow the specific formatting rules for each type as described. Ensure a good distribution of types.`;
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
      - For each question, identify the main 'topic' it covers from the key topics list and set its \`type\` field correctly.
      - Adhere STRICTLY to the JSON output schema. Do not include any extra text or markdown formatting outside of the JSON structure.
    `;
};

const getPracticeQuizPrompt = (config: PracticeConfig): string => {
    const questionTypeInstructions = {
        [QuestionType.MULTIPLE_CHOICE]: 'A multiple-choice question with exactly 4 options. Indicate the single correct answer in `correctAnswer`.',
        [QuestionType.TRUE_FALSE]: 'A statement that is either true or false. The `correctAnswer` must be either "True" or "False".',
        [QuestionType.FILL_IN_THE_BLANK]: 'A sentence with one or more blanks represented by "___". Provide the correct words for the blanks in the `correctAnswers` array.',
        [QuestionType.MATCHING]: 'A set of matching pairs. Provide prompts and answers in the `matchingPairs` field.',
        [QuestionType.SHORT_ANSWER]: 'A question requiring a concise answer (1-2 sentences). Provide a model correct answer in `correctAnswer`.',
        [QuestionType.ESSAY]: 'An open-ended question requiring a detailed response. Provide a model answer in `correctAnswer`.',
    };

    const requestedTypes = config.questionTypes.map(type => `- **${type}**: ${questionTypeInstructions[type]}`).join('\n');

    return `
      You are an expert curriculum designer. Create a practice quiz based on the following specifications.

      **Selected Topics:**
      ${config.topics.join(', ')}

      **Quiz Specifications:**
      - **Difficulty:** ${config.difficulty}
      - **Number of Questions:** ${config.numQuestions}
      - **Question Types to Include:** ${config.questionTypes.join(', ')}

      **Instructions:**
      - Generate exactly ${config.numQuestions} questions.
      - Each question must be one of the selected types. Distribute the types as evenly as possible.
      - Questions must be relevant to the selected topics and difficulty.
      - For each question, follow these formatting rules:
        ${requestedTypes}
      - For each question, identify the main 'topic' it covers from the selected topics list.
      - Adhere STRICTLY to the JSON output schema. Do not include any extra text or markdown formatting.
    `;
};


const questionSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: 'The question text. For Fill-in-the-Blank, use "___" for blanks.' },
        type: {
            type: Type.STRING,
            enum: Object.values(QuestionType),
            description: 'The type of the question.'
        },
        topic: { type: Type.STRING, description: 'The primary topic this question covers.' },
        options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Array of 4 options for Multiple Choice. Omit for other types.',
            nullable: true,
        },
        correctAnswer: {
            type: Type.STRING,
            description: 'The correct answer for Multiple Choice, True/False, Short Answer, or Essay. For T/F, it should be "True" or "False".',
            nullable: true,
        },
        correctAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Array of correct answers for each blank in a Fill-in-the-Blank question.',
            nullable: true,
        },
        matchingPairs: {
            type: Type.ARRAY,
            description: 'An array of prompt-answer pairs for Matching questions.',
            items: {
                type: Type.OBJECT,
                properties: {
                    prompt: { type: Type.STRING },
                    answer: { type: Type.STRING }
                },
                required: ['prompt', 'answer']
            },
            nullable: true,
        }
    },
    required: ['question', 'type', 'topic']
};


export const generateExam = async (config: ExamConfig, materials: Material[]): Promise<Question[]> => {
    const topicStrings = await extractTopics(materials);
    const topics = topicStrings.join(', ');
    if (!topics || topics.trim() === '') {
        throw new Error('Could not extract topics from the provided materials.');
    }

    const examPrompt = getExamPrompt(config, topics);

    const examGenerationResponse = await ai.models.generateContent({
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
};

export const generatePracticeQuiz = async (config: PracticeConfig): Promise<Question[]> => {
    const quizPrompt = getPracticeQuizPrompt(config);

    const quizGenerationResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: quizPrompt }] }],
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
        const jsonText = quizGenerationResponse.text.trim();
        const parsedResult = JSON.parse(jsonText);
        if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
            throw new Error("Invalid JSON structure for quiz received from API.");
        }
        return parsedResult.questions as Question[];
    } catch (e) {
        console.error("Failed to parse quiz JSON response:", quizGenerationResponse.text);
        throw new Error(`Error parsing practice quiz questions: ${(e as Error).message}`);
    }
};


const evaluateObjectiveAnswer = (question: Question, userAnswer: UserAnswer): Evaluation => {
    let isCorrect = false;
    let feedback = '';

    switch (question.type) {
        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.TRUE_FALSE:
            isCorrect = typeof userAnswer === 'string' && userAnswer.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase();
            feedback = isCorrect ? 'Correct!' : `The correct answer is: ${question.correctAnswer}`;
            break;

        case QuestionType.FILL_IN_THE_BLANK:
            if (Array.isArray(userAnswer) && Array.isArray(question.correctAnswers) && userAnswer.length === question.correctAnswers.length) {
                isCorrect = userAnswer.every((ans, i) => ans.trim().toLowerCase() === question.correctAnswers![i].trim().toLowerCase());
            }
            feedback = isCorrect ? 'Correct!' : `The correct answers are: ${question.correctAnswers?.join(', ')}`;
            break;

        case QuestionType.MATCHING:
             if (typeof userAnswer === 'object' && userAnswer !== null && !Array.isArray(userAnswer) && question.matchingPairs) {
                const correctMatches = question.matchingPairs.length;
                let userCorrectMatches = 0;
                question.matchingPairs.forEach(pair => {
                    if (userAnswer[pair.prompt] && userAnswer[pair.prompt].trim().toLowerCase() === pair.answer.trim().toLowerCase()) {
                        userCorrectMatches++;
                    }
                });
                isCorrect = userCorrectMatches === correctMatches;
                feedback = `You got ${userCorrectMatches} out of ${correctMatches} matches correct.`;
            } else {
                isCorrect = false;
                feedback = `You got 0 out of ${question.matchingPairs?.length || 0} matches correct.`;
            }
            break;

        default:
          isCorrect = false;
          feedback = 'This question type cannot be evaluated automatically.';
          break;
    }

    return {
        score: isCorrect ? 10 : 0,
        feedback,
        isCorrect,
        topic: question.topic,
    };
};

export const evaluateAnswer = async (question: Question, userAnswer: UserAnswer): Promise<Evaluation> => {
    if (userAnswer === null || userAnswer === '' || (Array.isArray(userAnswer) && userAnswer.every(u => u === ''))) {
        return { score: 0, feedback: 'No answer was provided.', isCorrect: false, topic: question.topic };
    }

    // Programmatic evaluation for objective types
    if (question.type !== QuestionType.SHORT_ANSWER && question.type !== QuestionType.ESSAY) {
        return evaluateObjectiveAnswer(question, userAnswer);
    }

    // AI evaluation for written answers
    const prompt = `
      You are an expert AI grader. Evaluate a student's answer for a '${question.type}' question.

      **Question:** ${question.question}
      **Model Answer (for reference):** ${question.correctAnswer}
      **Student's Answer:** ${userAnswer}

      **TASK:**
      1.  Provide a holistic score from 0 to 10.
      2.  Write concise, constructive overall feedback.
      3.  Provide a score breakdown based on the following criteria: Clarity, Accuracy, and Completeness. Each criterion is scored out of 10.
      4.  Identify specific, brief quotes from the student's answer that represent "strengths".
      5.  Identify specific, brief quotes from the student's answer that represent "weaknesses". If there are none, return an empty array.

      Respond STRICTLY in the following JSON format.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER, description: 'Overall score from 0-10.' },
                    feedback: { type: Type.STRING, description: 'Overall constructive feedback.' },
                    isCorrect: { type: Type.BOOLEAN, description: 'True if score >= 7.' },
                    criteria: {
                        type: Type.ARRAY,
                        description: "Breakdown of scores by criteria.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                criterion: { type: Type.STRING },
                                score: { type: Type.NUMBER },
                                feedback: { type: Type.STRING }
                            },
                            required: ["criterion", "score", "feedback"]
                        }
                    },
                    strengths: {
                        type: Type.ARRAY,
                        description: "Quotes from the student's answer that are strengths.",
                        items: { type: Type.STRING }
                    },
                    weaknesses: {
                        type: Type.ARRAY,
                        description: "Quotes from the student's answer that are weaknesses.",
                        items: { type: Type.STRING }
                    }
                },
                required: ['score', 'feedback', 'isCorrect', 'criteria', 'strengths', 'weaknesses']
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);
        return { ...parsedResult, topic: question.topic };
    } catch (e) {
        console.error("Failed to parse detailed evaluation response:", response.text);
        // Fallback to a simpler evaluation if the detailed one fails
        return {
            score: 0,
            feedback: 'Could not automatically perform a detailed evaluation for this answer.',
            isCorrect: false,
            topic: question.topic,
        };
    }
};
