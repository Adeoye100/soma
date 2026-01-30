import winston from 'winston';

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
  options?: string[] | undefined;
  correctAnswer: string;
  topic: string;
}

// Predefined question templates and topics
const QUESTION_TEMPLATES = {
  OBJECTIVE: {
    easy: [
      "What is the definition of {topic}?",
      "Which of the following is {topic}?",
      "What is a basic example of {topic}?",
      "What does {topic} refer to?"
    ],
    medium: [
      "How does {topic} relate to {related_topic}?",
      "What are the key characteristics of {topic}?",
      "Which statement about {topic} is correct?",
      "What is the primary function of {topic}?"
    ],
    hard: [
      "Analyze the relationship between {topic} and {related_topic}.",
      "What are the advanced applications of {topic}?",
      "Compare and contrast {topic} with {related_topic}.",
      "What are the limitations of {topic}?"
    ]
  },
  SHORT_ANSWER: {
    easy: [
      "Explain what {topic} is in simple terms.",
      "Give a brief description of {topic}.",
      "What is the main purpose of {topic}?"
    ],
    medium: [
      "Describe how {topic} works.",
      "What are the benefits of {topic}?",
      "Explain the importance of {topic}."
    ],
    hard: [
      "Analyze the impact of {topic} on modern systems.",
      "Discuss the challenges associated with {topic}.",
      "Evaluate the effectiveness of {topic} in real-world applications."
    ]
  },
  ESSAY: {
    easy: [
      "Write a short essay about {topic}.",
      "Discuss the basic concepts of {topic}."
    ],
    medium: [
      "Explain the principles and applications of {topic}.",
      "Discuss the advantages and disadvantages of {topic}."
    ],
    hard: [
      "Critically analyze the role of {topic} in contemporary society.",
      "Evaluate the future implications of {topic} in your field."
    ]
  }
};

// Common topics in various subjects
const COMMON_TOPICS = {
  technology: ['algorithms', 'data structures', 'machine learning', 'databases', 'networks', 'security', 'cloud computing'],
  science: ['physics', 'chemistry', 'biology', 'mathematics', 'statistics', 'research methods'],
  business: ['management', 'finance', 'marketing', 'economics', 'strategy', 'operations'],
  general: ['communication', 'leadership', 'ethics', 'innovation', 'problem solving', 'analysis']
};

export class CodeBasedExamService {
  /**
   * Extract topics from materials using simple text analysis
   */
  private extractTopicsFromMaterials(materials: Material[]): string[] {
    const allText = materials.map(m => m.content).join(' ').toLowerCase();
    const foundTopics: string[] = [];

    // Simple keyword matching for common topics
    Object.values(COMMON_TOPICS).flat().forEach(topic => {
      if (allText.includes(topic.toLowerCase())) {
        foundTopics.push(topic);
      }
    });

    // Extract potential topics from text (words that appear frequently)
    const words = allText.match(/\b\w{4,}\b/g) || [];
    const wordCount: { [key: string]: number } = {};

    words.forEach(word => {
      if (!['that', 'with', 'have', 'this', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'].includes(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    // Get top frequent words as additional topics
    const sortedWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return [...new Set([...foundTopics, ...sortedWords])].slice(0, 20); // Limit to 20 topics
  }

  /**
   * Generate questions based on extracted topics
   */
  private generateQuestionsFromTopics(topics: string[], config: ExamConfig): Question[] {
    const questions: Question[] = [];
    const templates = QUESTION_TEMPLATES[config.type][config.difficulty];

    for (let i = 0; i < config.numQuestions; i++) {
      const topic = topics[i % topics.length] || 'general concepts';
      const relatedTopic = topics[(i + 1) % topics.length] || 'related concepts';
      const template = templates[i % templates.length] || templates[0];

      let questionText = '';
      if (template) {
        questionText = template
          .replace('{topic}', topic)
          .replace('{related_topic}', relatedTopic);
      }

      let correctAnswer: string;
      let options: string[] | undefined;

      if (config.type === 'OBJECTIVE') {
        // Generate multiple choice options
        const generatedOptions = this.generateOptions(topic, config.difficulty);
        options = this.shuffleArray(generatedOptions);
        correctAnswer = options[0] || 'Default answer'; // First option is correct after shuffle
      } else {
        // For written answers, provide a model answer
        correctAnswer = this.generateModelAnswer(topic, config.type, config.difficulty);
        options = undefined;
      }

      questions.push({
        question: questionText,
        options,
        correctAnswer,
        topic
      });
    }

    return questions;
  }

  /**
   * Generate multiple choice options
   */
  private generateOptions(topic: string, difficulty: string): string[] {
    const correctAnswer = `The correct understanding of ${topic}`;
    const distractors = [
      `A misunderstanding of ${topic}`,
      `An unrelated concept to ${topic}`,
      `A partial view of ${topic}`,
      `An outdated concept about ${topic}`
    ];

    return this.shuffleArray([correctAnswer, ...distractors.slice(0, 3)]);
  }

  /**
   * Generate model answers for written questions
   */
  private generateModelAnswer(topic: string, type: string, difficulty: string): string {
    const baseAnswer = `${topic} is a fundamental concept that involves understanding its core principles and applications.`;

    if (type === 'SHORT_ANSWER') {
      return difficulty === 'easy'
        ? `${baseAnswer} It plays an important role in various contexts.`
        : `${baseAnswer} Its applications span multiple domains and require careful consideration of best practices.`;
    } else { // ESSAY
      return `${baseAnswer} This concept has evolved significantly over time and continues to influence modern practices. Understanding ${topic} requires examining its historical development, current applications, and future implications. Various factors contribute to its importance, including efficiency, scalability, and adaptability to changing requirements.`;
    }
  }

  /**
   * Shuffle array utility
   */
  private shuffleArray(array: string[]): string[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }

  /**
   * Generate exam using code-based logic
   */
  async generateExam(config: ExamConfig, materials: Material[]): Promise<Question[]> {
    try {
      winston.info(`Generating ${config.type} exam with ${config.numQuestions} questions at ${config.difficulty} difficulty`);

      // Extract topics from materials
      const topics = this.extractTopicsFromMaterials(materials);

      if (topics.length === 0) {
        // Fallback topics if none found
        topics.push(...COMMON_TOPICS.general.slice(0, 5));
      }

      winston.info(`Extracted ${topics.length} topics: ${topics.slice(0, 5).join(', ')}...`);

      // Generate questions
      const questions = this.generateQuestionsFromTopics(topics, config);

      winston.info(`Successfully generated ${questions.length} questions`);

      return questions;
    } catch (error) {
      winston.error('Error in code-based exam generation:', error);
      throw new Error('Failed to generate exam using code-based logic');
    }
  }
}

export const codeBasedExamService = new CodeBasedExamService();
export default codeBasedExamService;