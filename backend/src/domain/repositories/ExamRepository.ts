import { Exam } from '../entities/Exam';
import { Query, QueryResult } from '../../shared/types';
import { NotFoundError } from '../../shared/errors';

/**
 * Repository interface for Exam entity
 * Abstracts data access logic from business logic
 */
export interface ExamRepository {
  /**
   * Save an exam to the repository
   */
  save(exam: Exam): Promise<Exam>;
  
  /**
   * Find an exam by ID
   */
  findById(id: string): Promise<Exam | null>;
  
  /**
   * Find all exams for a user
   */
  findByUserId(userId: string, query?: Query<Exam>): Promise<QueryResult<Exam>>;
  
  /**
   * Find exams by status
   */
  findByStatus(status: string, query?: Query<Exam>): Promise<QueryResult<Exam>>;
  
  /**
   * Delete an exam by ID
   */
  deleteById(id: string): Promise<void>;
  
  /**
   * Check if an exam exists
   */
  exists(id: string): Promise<boolean>;
  
  /**
   * Count exams by user
   */
  countByUserId(userId: string): Promise<number>;
  
  /**
   * Get exam statistics
   */
  getStatistics(userId: string): Promise<{
    totalExams: number;
    completedExams: number;
    averageScore: number;
    lastExamDate?: string;
  }>;
}

/**
 * In-memory implementation of ExamRepository for development/testing
 */
export class InMemoryExamRepository implements ExamRepository {
  private exams: Map<string, Exam> = new Map();

  async save(exam: Exam): Promise<Exam> {
    const existingExam = this.exams.get(exam.id);
    if (existingExam) {
      // Update existing exam
      this.exams.set(exam.id, exam);
    } else {
      // Create new exam
      this.exams.set(exam.id, exam);
    }
    return exam;
  }

  async findById(id: string): Promise<Exam | null> {
    const exam = this.exams.get(id);
    return exam || null;
  }

  async findByUserId(userId: string, query?: Query<Exam>): Promise<QueryResult<Exam>> {
    const userExams = Array.from(this.exams.values())
      .filter(exam => exam.userId === userId);

    const { filter, sort, pagination } = query || {};
    let filteredExams = userExams;

    // Apply filtering
    if (filter) {
      filteredExams = userExams.filter(exam => {
        return Object.entries(filter).every(([key, value]) => {
          const examValue = (exam as any)[key];
          if (Array.isArray(value)) {
            return value.includes(examValue);
          }
          return examValue === value;
        });
      });
    }

    // Apply sorting
    if (sort) {
      filteredExams.sort((a, b) => {
        const aValue = (a as any)[sort.field];
        const bValue = (b as any)[sort.field];
        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sort.direction === 'desc' ? -comparison : comparison;
      });
    }

    const total = filteredExams.length;
    let startIndex = 0;
    let endIndex = total;

    // Apply pagination
    if (pagination) {
      startIndex = (pagination.page - 1) * pagination.limit;
      endIndex = startIndex + pagination.limit;
      filteredExams = filteredExams.slice(startIndex, endIndex);
    }

    return {
      data: filteredExams,
      total,
      page: pagination?.page || 1,
      limit: pagination?.limit || total,
      totalPages: Math.ceil(total / (pagination?.limit || total))
    };
  }

  async findByStatus(status: string, query?: Query<Exam>): Promise<QueryResult<Exam>> {
    const statusExams = Array.from(this.exams.values())
      .filter(exam => exam.status === status);

    const { filter, sort, pagination } = query || {};
    let filteredExams = statusExams;

    // Apply additional filtering
    if (filter) {
      filteredExams = statusExams.filter(exam => {
        return Object.entries(filter).every(([key, value]) => {
          const examValue = (exam as any)[key];
          if (Array.isArray(value)) {
            return value.includes(examValue);
          }
          return examValue === value;
        });
      });
    }

    // Apply sorting
    if (sort) {
      filteredExams.sort((a, b) => {
        const aValue = (a as any)[sort.field];
        const bValue = (b as any)[sort.field];
        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sort.direction === 'desc' ? -comparison : comparison;
      });
    }

    const total = filteredExams.length;
    let startIndex = 0;
    let endIndex = total;

    // Apply pagination
    if (pagination) {
      startIndex = (pagination.page - 1) * pagination.limit;
      endIndex = startIndex + pagination.limit;
      filteredExams = filteredExams.slice(startIndex, endIndex);
    }

    return {
      data: filteredExams,
      total,
      page: pagination?.page || 1,
      limit: pagination?.limit || total,
      totalPages: Math.ceil(total / (pagination?.limit || total))
    };
  }

  async deleteById(id: string): Promise<void> {
    if (!this.exams.has(id)) {
      throw new NotFoundError(`Exam with id ${id}`);
    }
    this.exams.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.exams.has(id);
  }

  async countByUserId(userId: string): Promise<number> {
    return Array.from(this.exams.values())
      .filter(exam => exam.userId === userId)
      .length;
  }

  async getStatistics(userId: string): Promise<{
    totalExams: number;
    completedExams: number;
    averageScore: number;
    lastExamDate?: string;
  }> {
    const userExams = Array.from(this.exams.values())
      .filter(exam => exam.userId === userId);

    const totalExams = userExams.length;
    const completedExams = userExams.filter(exam => exam.status === 'COMPLETED').length;
    
    // For average score, we'd need to calculate from evaluations
    // For now, return a placeholder
    const averageScore = completedExams > 0 ? 75 : 0;
    
    const lastExamDate = userExams
      .filter(exam => exam.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0]
      ?.completedAt?.toISOString();

    return {
      totalExams,
      completedExams,
      averageScore,
      lastExamDate
    };
  }
}

/**
 * Repository factory for creating appropriate repository implementations
 */
export class ExamRepositoryFactory {
  private static instance: ExamRepository;

  static getRepository(): ExamRepository {
    if (!this.instance) {
      // In a real application, this would choose the appropriate implementation
      // based on configuration (database, memory, etc.)
      this.instance = new InMemoryExamRepository();
    }
    return this.instance;
  }

  static setRepository(repository: ExamRepository): void {
    this.instance = repository;
  }
}
