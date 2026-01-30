import winston from 'winston';

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

export class CodeBasedEvaluationService {
  /**
   * Evaluate objective (multiple choice) questions
   */
  private evaluateObjective(question: Question, userAnswer: UserAnswer): EvaluationResult {
    const isCorrect = userAnswer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

    return {
      score: isCorrect ? 10 : 0,
      feedback: isCorrect
        ? 'Correct! Well done.'
        : `Incorrect. The correct answer is: ${question.correctAnswer}`,
      isCorrect,
      topic: question.topic
    };
  }

  /**
   * Evaluate short answer questions using keyword matching
   */
  private evaluateShortAnswer(question: Question, userAnswer: UserAnswer): EvaluationResult {
    const userText = userAnswer.answer.trim().toLowerCase();
    const correctText = question.correctAnswer.trim().toLowerCase();

    if (userText === '') {
      return {
        score: 0,
        feedback: 'Please provide an answer.',
        isCorrect: false,
        topic: question.topic
      };
    }

    // Extract keywords from correct answer (words longer than 3 characters)
    const correctKeywords = correctText.match(/\b\w{4,}\b/g) || [];
    const userKeywords = userText.match(/\b\w{4,}\b/g) || [];

    // Calculate keyword match ratio
    const matchedKeywords = correctKeywords.filter(keyword =>
      userKeywords.some(userKeyword => userKeyword.includes(keyword) || keyword.includes(userKeyword))
    );

    const matchRatio = correctKeywords.length > 0 ? matchedKeywords.length / correctKeywords.length : 0;

    // Length appropriateness (short answers should be concise)
    const wordCount = userText.split(/\s+/).length;
    const lengthScore = wordCount >= 5 && wordCount <= 50 ? 1 : 0.5;

    // Calculate final score
    const baseScore = Math.round(matchRatio * 8); // 0-8 points for content
    const finalScore = Math.round(baseScore * lengthScore); // Apply length penalty

    let feedback = '';
    let isCorrect = finalScore >= 6;

    if (matchRatio >= 0.8) {
      feedback = 'Excellent answer! You covered the key points well.';
    } else if (matchRatio >= 0.6) {
      feedback = 'Good answer, but you could elaborate more on key concepts.';
    } else if (matchRatio >= 0.3) {
      feedback = 'Partial credit. Your answer touches on some important points but misses key elements.';
    } else {
      feedback = 'Your answer needs more development. Please review the correct approach.';
    }

    if (lengthScore < 1) {
      feedback += wordCount < 5
        ? ' Try to provide more detail in your answer.'
        : ' Try to be more concise while covering the essential points.';
    }

    return {
      score: Math.min(finalScore, 10),
      feedback,
      isCorrect,
      topic: question.topic
    };
  }

  /**
   * Evaluate essay questions using comprehensive analysis
   */
  private evaluateEssay(question: Question, userAnswer: UserAnswer): EvaluationResult {
    const userText = userAnswer.answer.trim();
    const correctText = question.correctAnswer.trim().toLowerCase();

    if (userText.length < 50) {
      return {
        score: 0,
        feedback: 'Your essay is too short. Please provide a more comprehensive response.',
        isCorrect: false,
        topic: question.topic
      };
    }

    // Basic criteria analysis
    const wordCount = userText.split(/\s+/).length;
    const userLower = userText.toLowerCase();

    // Keyword matching (more comprehensive for essays)
    const correctKeywords = correctText.match(/\b\w{4,}\b/g) || [];
    const userWords = userLower.match(/\b\w{4,}\b/g) || [];

    const matchedKeywords = correctKeywords.filter(keyword =>
      userWords.some(userWord => userWord.includes(keyword) || keyword.includes(userWord))
    );

    const keywordScore = correctKeywords.length > 0 ? matchedKeywords.length / correctKeywords.length : 0;

    // Structure analysis (look for paragraphs, transitions)
    const paragraphs = userText.split(/\n\s*\n/).length;
    const hasTransitions = /\b(however|therefore|thus|consequently|furthermore|moreover|in addition|on the other hand)\b/i.test(userText);
    const hasConclusion = /\b(in conclusion|to conclude|in summary|overall|finally)\b/i.test(userText);

    const structureScore = (paragraphs >= 3 ? 1 : paragraphs >= 2 ? 0.7 : 0.3) *
                          (hasTransitions ? 1.2 : 1) *
                          (hasConclusion ? 1.2 : 1);

    // Length appropriateness (essays should be substantial)
    const lengthScore = wordCount >= 200 ? 1 : wordCount >= 100 ? 0.8 : 0.5;

    // Calculate final score
    const contentScore = Math.round(keywordScore * 6); // 0-6 for content
    const structureBonus = Math.round((structureScore - 1) * 2); // -2 to +2 for structure
    const lengthBonus = Math.round((lengthScore - 1) * 2); // -1 to +1 for length

    const finalScore = Math.max(0, Math.min(10, contentScore + structureBonus + lengthBonus));

    let feedback = '';
    let isCorrect = finalScore >= 7;

    if (finalScore >= 8) {
      feedback = 'Outstanding essay! You demonstrated excellent understanding and organization.';
    } else if (finalScore >= 6) {
      feedback = 'Good essay with solid content. Consider improving the structure and depth.';
    } else if (finalScore >= 4) {
      feedback = 'Your essay shows some understanding but needs more development and key concepts.';
    } else {
      feedback = 'Your essay requires significant improvement in content, structure, and analysis.';
    }

    // Specific suggestions
    const suggestions = [];
    if (keywordScore < 0.5) suggestions.push('Include more key concepts from the topic');
    if (structureScore < 0.8) suggestions.push('Improve essay structure with clear paragraphs and transitions');
    if (lengthScore < 0.8) suggestions.push('Expand your analysis with more detailed explanations');
    if (!hasConclusion) suggestions.push('Add a proper conclusion to summarize your main points');

    if (suggestions.length > 0) {
      feedback += ' Suggestions: ' + suggestions.join(', ') + '.';
    }

    return {
      score: finalScore,
      feedback,
      isCorrect,
      topic: question.topic
    };
  }

  /**
   * Main evaluation method
   */
  async evaluateAnswer(question: Question, userAnswer: UserAnswer): Promise<EvaluationResult> {
    try {
      winston.debug(`Evaluating answer for question type: ${question.options ? 'objective' : 'written'}`);

      if (question.options && question.options.length > 0) {
        // Objective question
        return this.evaluateObjective(question, userAnswer);
      } else if (question.correctAnswer.length < 200) {
        // Short answer
        return this.evaluateShortAnswer(question, userAnswer);
      } else {
        // Essay
        return this.evaluateEssay(question, userAnswer);
      }
    } catch (error) {
      winston.error('Error in code-based answer evaluation:', error);
      return {
        score: 0,
        feedback: 'Unable to evaluate answer automatically. Please review manually.',
        isCorrect: false,
        topic: question.topic
      };
    }
  }

  /**
   * Batch evaluation for multiple answers
   */
  async evaluateAnswers(questions: Question[], userAnswers: UserAnswer[]): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    const minLength = Math.min(questions.length, userAnswers.length);

    for (let i = 0; i < minLength; i++) {
      const question = questions[i];
      const userAnswer = userAnswers[i];

      if (question && userAnswer) {
        const result = await this.evaluateAnswer(question, userAnswer);
        results.push(result);
      }
    }

    return results;
  }
}

export const codeBasedEvaluationService = new CodeBasedEvaluationService();
export default codeBasedEvaluationService;