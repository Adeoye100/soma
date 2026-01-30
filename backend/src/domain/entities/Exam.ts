import { Question, ExamConfig, Material, UserAnswer, EvaluationResult } from '../../shared/types';
import { DomainError, ValidationError } from '../../shared/errors';

/**
 * Exam Entity - Core domain object representing an examination
 */
export class Exam {
  private readonly _id: string;
  private _userId: string;
  private _config: ExamConfig;
  private _materials: Material[];
  private _questions: Question[];
  private _status: ExamStatus;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _startedAt?: Date;
  private _completedAt?: Date;
  private _duration?: number; // in seconds

  private constructor(
    id: string,
    userId: string,
    config: ExamConfig,
    materials: Material[]
  ) {
    this._id = id;
    this._userId = userId;
    this._config = config;
    this._materials = materials;
    this._questions = [];
    this._status = ExamStatus.CREATED;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Factory method to create a new exam
   */
  public static create(
    id: string,
    userId: string,
    config: ExamConfig,
    materials: Material[]
  ): Exam {
    // Validate input
    Exam.validateExamCreation(id, userId, config, materials);
    
    return new Exam(id, userId, config, materials);
  }

  /**
   * Load existing exam from data
   */
  public static fromPersistence(data: any): Exam {
    const exam = new Exam(data.id, data.userId, data.config, data.materials);
    exam._questions = data.questions || [];
    exam._status = data.status;
    exam._createdAt = new Date(data.createdAt);
    exam._updatedAt = new Date(data.updatedAt);
    exam._startedAt = data.startedAt ? new Date(data.startedAt) : undefined;
    exam._completedAt = data.completedAt ? new Date(data.completedAt) : undefined;
    exam._duration = data.duration;
    return exam;
  }

  // Getters
  public get id(): string { return this._id; }
  public get userId(): string { return this._userId; }
  public get config(): ExamConfig { return this._config; }
  public get materials(): Material[] { return [...this._materials]; }
  public get questions(): Question[] { return [...this._questions]; }
  public get status(): ExamStatus { return this._status; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }
  public get startedAt(): Date | undefined { return this._startedAt; }
  public get completedAt(): Date | undefined { return this._completedAt; }
  public get duration(): number | undefined { return this._duration; }

  /**
   * Add questions to the exam
   */
  public addQuestions(questions: Question[]): void {
    if (this._status !== ExamStatus.CREATED) {
      throw new DomainError('Questions can only be added to exams in CREATED status');
    }

    if (!questions || questions.length === 0) {
      throw new ValidationError('Questions array cannot be empty');
    }

    // Validate questions
    questions.forEach(question => this.validateQuestion(question));

    this._questions = [...questions];
    this._updatedAt = new Date();
  }

  /**
   * Start the exam
   */
  public start(): void {
    if (this._status !== ExamStatus.CREATED) {
      throw new DomainError('Exam can only be started from CREATED status');
    }

    if (this._questions.length === 0) {
      throw new DomainError('Cannot start exam without questions');
    }

    this._status = ExamStatus.IN_PROGRESS;
    this._startedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Complete the exam
   */
  public complete(): void {
    if (this._status !== ExamStatus.IN_PROGRESS) {
      throw new DomainError('Exam can only be completed from IN_PROGRESS status');
    }

    this._status = ExamStatus.COMPLETED;
    this._completedAt = new Date();
    this._duration = this._startedAt ? 
      Math.floor((this._completedAt.getTime() - this._startedAt.getTime()) / 1000) : 
      undefined;
    this._updatedAt = new Date();
  }

  /**
   * Submit answers and get evaluation
   */
  public submitAnswers(answers: UserAnswer[]): EvaluationResult[] {
    if (this._status !== ExamStatus.IN_PROGRESS) {
      throw new DomainError('Answers can only be submitted for exams in IN_PROGRESS status');
    }

    if (!answers || answers.length !== this._questions.length) {
      throw new ValidationError('All questions must be answered');
    }

    // Validate answers
    answers.forEach(answer => this.validateAnswer(answer));

    const evaluations: EvaluationResult[] = [];

    // Evaluate each answer
    for (let i = 0; i < this._questions.length; i++) {
      const question = this._questions[i];
      const userAnswer = answers[i];
      const evaluation = this.evaluateAnswer(question, userAnswer);
      evaluations.push(evaluation);
    }

    this._updatedAt = new Date();
    return evaluations;
  }

  /**
   * Get exam statistics
   */
  public getStatistics(): ExamStatistics {
    const now = new Date();
    const duration = this._startedAt ? 
      (this._completedAt || now).getTime() - this._startedAt.getTime() : 0;
    
    return {
      totalQuestions: this._questions.length,
      status: this._status,
      duration: Math.floor(duration / 1000),
      createdAt: this._createdAt,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      isActive: this._status === ExamStatus.IN_PROGRESS,
      canStart: this._status === ExamStatus.CREATED && this._questions.length > 0,
      canComplete: this._status === ExamStatus.IN_PROGRESS
    };
  }

  /**
   * Convert to plain object for persistence
   */
  public toPersistence(): any {
    return {
      id: this._id,
      userId: this._userId,
      config: this._config,
      materials: this._materials,
      questions: this._questions,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      startedAt: this._startedAt?.toISOString(),
      completedAt: this._completedAt?.toISOString(),
      duration: this._duration
    };
  }

  // Private methods
  private static validateExamCreation(
    id: string,
    userId: string,
    config: ExamConfig,
    materials: Material[]
  ): void {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Exam ID is required');
    }

    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID is required');
    }

    if (!config || !config.type || !config.difficulty || !config.numQuestions) {
      throw new ValidationError('Valid exam config is required');
    }

    if (!materials || materials.length === 0) {
      throw new ValidationError('At least one material is required');
    }

    if (config.numQuestions < 1 || config.numQuestions > 100) {
      throw new ValidationError('Number of questions must be between 1 and 100');
    }
  }

  private validateQuestion(question: Question): void {
    if (!question.question || typeof question.question !== 'string') {
      throw new ValidationError('Question text is required');
    }

    if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
      throw new ValidationError('Correct answer is required');
    }

    if (!question.topic || typeof question.topic !== 'string') {
      throw new ValidationError('Question topic is required');
    }

    if (this._config.type === 'OBJECTIVE' && (!question.options || question.options.length < 2)) {
      throw new ValidationError('Objective questions must have at least 2 options');
    }
  }

  private validateAnswer(answer: UserAnswer): void {
    if (!answer.questionId || typeof answer.questionId !== 'string') {
      throw new ValidationError('Question ID is required');
    }

    if (answer.answer === undefined || answer.answer === null) {
      throw new ValidationError('Answer is required');
    }
  }

  private evaluateAnswer(question: Question, userAnswer: UserAnswer): EvaluationResult {
    // For objective questions, simple comparison
    if (question.options) {
      const isCorrect = userAnswer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      return {
        score: isCorrect ? 10 : 0,
        feedback: isCorrect ? 'Correct!' : `The correct answer is: ${question.correctAnswer}`,
        isCorrect,
        topic: question.topic
      };
    }

    // For subjective questions, this would typically call an AI service
    // For now, we'll return a placeholder
    return {
      score: 5, // Default score
      feedback: 'Answer submitted successfully',
      isCorrect: false,
      topic: question.topic
    };
  }
}

/**
 * Exam status enum
 */
export enum ExamStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

/**
 * Exam statistics
 */
export interface ExamStatistics {
  totalQuestions: number;
  status: ExamStatus;
  duration: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  isActive: boolean;
  canStart: boolean;
  canComplete: boolean;
}
