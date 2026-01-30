import { BusinessRule, RuleContext, RuleResult } from '../core/types';
import { BusinessRuleError } from '../../shared/errors';

/**
 * Pre-exam validation rules - Validate exam setup before generation
 */
export class ExamConfigurationRule implements BusinessRule {
  public id = 'exam-configuration-validator';
  public name = 'Exam Configuration Validator';
  public description = 'Validates exam configuration parameters for feasibility and quality';
  public priority = 90;
  public enabled = true;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { input } = context;
    const config = input.config || input;

    const issues: string[] = [];
    const warnings: string[] = [];

    // Validate question count vs material content
    if (config.materials && config.numQuestions) {
      const totalContent = config.materials.reduce((sum: number, material: any) => {
        return sum + (material.content?.length || 0);
      }, 0);

      const wordsPerQuestion = totalContent / config.numQuestions;
      
      if (wordsPerQuestion < 50) {
        issues.push('Insufficient content per question. Need more study materials.');
      } else if (wordsPerQuestion < 200) {
        warnings.push('Limited content per question may impact question quality.');
      }
    }

    // Validate difficulty vs question type
    if (config.type === 'ESSAY' && config.difficulty === 'hard' && config.numQuestions > 15) {
      warnings.push('High number of difficult essay questions may be overwhelming for students.');
    }

    // Validate time constraints
    if (config.timeLimit) {
      const estimatedTimePerQuestion = this.estimateTimePerQuestion(config);
      const totalEstimatedTime = estimatedTimePerQuestion * config.numQuestions;
      
      if (totalEstimatedTime > config.timeLimit * 0.9) {
        warnings.push('Estimated completion time exceeds 90% of allocated time.');
      }
    }

    const passed = issues.length === 0;
    
    return {
      passed,
      message: passed ? 'Exam configuration is valid' : 'Exam configuration has issues',
      severity: passed ? (warnings.length > 0 ? 'warning' : 'info') : 'error',
      details: {
        issues,
        warnings,
        estimatedTimePerQuestion: this.estimateTimePerQuestion(config),
        contentSufficiency: this.assessContentSufficiency(config)
      },
      recommendations: this.generateRecommendations(config, issues, warnings)
    };
  }

  private estimateTimePerQuestion(config: any): number {
    const baseTime = {
      'OBJECTIVE': { easy: 1, medium: 1.5, hard: 2 },
      'SHORT_ANSWER': { easy: 3, medium: 5, hard: 7 },
      'ESSAY': { easy: 8, medium: 12, hard: 15 }
    };

    return (baseTime as any)[config.type]?.[config.difficulty] || 2;
  }

  private assessContentSufficiency(config: any): string {
    if (!config.materials || !config.numQuestions) return 'unknown';
    
    const totalWords = config.materials.reduce((sum: number, material: any) => {
      return sum + (material.content?.split(' ').length || 0);
    }, 0);

    const wordsPerQuestion = totalWords / config.numQuestions;
    
    if (wordsPerQuestion > 500) return 'excellent';
    if (wordsPerQuestion > 200) return 'good';
    if (wordsPerQuestion > 100) return 'adequate';
    return 'insufficient';
  }

  private generateRecommendations(config: any, issues: string[], warnings: string[]): string[] {
    const recommendations: string[] = [];

    if (issues.includes('Insufficient content per question. Need more study materials.')) {
      recommendations.push('Add more comprehensive study materials or reduce the number of questions.');
    }

    if (config.type === 'ESSAY' && config.numQuestions > 20) {
      recommendations.push('Consider breaking large essay exams into smaller sections.');
    }

    if (config.difficulty === 'hard' && config.numQuestions > 50) {
      recommendations.push('High difficulty with many questions may impact student performance. Consider reducing quantity or difficulty.');
    }

    return recommendations;
  }
}

/**
 * Material quality assessment rule
 */
export class MaterialQualityRule implements BusinessRule {
  public id = 'material-quality-assessor';
  public name = 'Material Quality Assessor';
  public description = 'Assesses the quality and suitability of study materials';
  public priority = 80;
  public enabled = true;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { input } = context;
    const materials = input.materials || [];

    if (!Array.isArray(materials) || materials.length === 0) {
      return {
        passed: false,
        message: 'No study materials provided',
        severity: 'error',
        details: { materialCount: 0 }
      };
    }

    const assessments = materials.map((material, index) => this.assessMaterial(material, index));
    const passedCount = assessments.filter(a => a.passed).length;
    const overallPassed = passedCount === assessments.length;

    const criticalIssues = assessments.filter(a => a.severity === 'error').length;
    const warnings = assessments.filter(a => a.severity === 'warning').length;

    return {
      passed: overallPassed,
      message: `Material quality assessment: ${passedCount}/${assessments.length} materials passed`,
      severity: criticalIssues > 0 ? 'error' : (warnings > 0 ? 'warning' : 'info'),
      details: {
        totalMaterials: materials.length,
        passedMaterials: passedCount,
        failedMaterials: assessments.length - passedCount,
        criticalIssues,
        warnings,
        assessments
      },
      recommendations: this.generateMaterialRecommendations(assessments)
    };
  }

  private assessMaterial(material: any, index: number) {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check content quality
    if (!material.content || material.content.trim().length < 100) {
      issues.push(`Material ${index + 1} has insufficient content (less than 100 characters)`);
    }

    // Check for formatting issues
    if (material.content && material.content.length > 0) {
      const hasStructure = /\\n\\n|\\n-|\\d+\\./.test(material.content);
      if (!hasStructure) {
        warnings.push(`Material ${index + 1} lacks clear structure or formatting`);
      }

      // Check for educational content indicators
      const educationalIndicators = ['definition', 'concept', 'principle', 'theory', 'example', 'exercise'];
      const hasEducationalContent = educationalIndicators.some(indicator => 
        material.content.toLowerCase().includes(indicator)
      );
      
      if (!hasEducationalContent) {
        warnings.push(`Material ${index + 1} may not contain clear educational content`);
      }
    }

    // Check file size limits
    if (material.content && material.content.length > 100000) {
      warnings.push(`Material ${index + 1} is very large and may impact processing time`);
    }

    const passed = issues.length === 0;
    return {
      passed,
      severity: issues.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'info'),
      issues,
      warnings,
      materialIndex: index,
      materialTitle: material.title || `Material ${index + 1}`
    };
  }

  private generateMaterialRecommendations(assessments: any[]): string[] {
    const recommendations: string[] = [];
    const failedMaterials = assessments.filter(a => !a.passed);

    if (failedMaterials.length > 0) {
      recommendations.push('Review and improve failed materials before proceeding with exam generation.');
    }

    const materialsWithoutStructure = assessments.filter(a => 
      a.warnings.some((w: string) => w.includes('structure'))
    );

    if (materialsWithoutStructure.length > 0) {
      recommendations.push('Consider reformatting materials with clear headings, bullet points, or numbered lists.');
    }

    if (assessments.length < 3) {
      recommendations.push('Consider providing more diverse study materials for better question coverage.');
    }

    return recommendations;
  }
}

/**
 * Question feasibility rule
 */
export class QuestionFeasibilityRule implements BusinessRule {
  public id = 'question-feasibility-checker';
  public name = 'Question Feasibility Checker';
  public description = 'Checks if the requested questions can be feasibly generated';
  public priority = 85;
  public enabled = true;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { input } = context;
    const config = input.config || input;

    const feasibilityFactors = this.analyzeFeasibility(config);
    
    const passed = feasibilityFactors.overallScore >= 0.6;
    const severity = feasibilityFactors.overallScore >= 0.8 ? 'info' : 
                    feasibilityFactors.overallScore >= 0.6 ? 'warning' : 'error';

    return {
      passed,
      message: `Question feasibility score: ${(feasibilityFactors.overallScore * 100).toFixed(1)}%`,
      severity,
      details: feasibilityFactors,
      recommendations: this.generateFeasibilityRecommendations(feasibilityFactors)
    };
  }

  private analyzeFeasibility(config: any) {
    const factors = {
      contentRichness: this.assessContentRichness(config),
      timeConstraints: this.assessTimeConstraints(config),
      difficultyAlignment: this.assessDifficultyAlignment(config),
      questionTypeSuitability: this.assessQuestionTypeSuitability(config)
    };

    const weights = {
      contentRichness: 0.4,
      timeConstraints: 0.25,
      difficultyAlignment: 0.2,
      questionTypeSuitability: 0.15
    };

    const overallScore = Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + (value * weights[key as keyof typeof weights]);
    }, 0);

    return {
      ...factors,
      overallScore,
      passed: overallScore >= 0.6
    };
  }

  private assessContentRichness(config: any): number {
    if (!config.materials || !config.numQuestions) return 0.5;

    const totalWords = config.materials.reduce((sum: number, material: any) => {
      return sum + (material.content?.split(' ').length || 0);
    }, 0);

    const wordsPerQuestion = totalWords / config.numQuestions;
    
    if (wordsPerQuestion > 500) return 1.0;
    if (wordsPerQuestion > 200) return 0.8;
    if (wordsPerQuestion > 100) return 0.6;
    if (wordsPerQuestion > 50) return 0.3;
    return 0.1;
  }

  private assessTimeConstraints(config: any): number {
    if (!config.timeLimit || !config.numQuestions) return 0.7;

    const timePerQuestion = config.timeLimit / config.numQuestions;
    const minTimeRequired = this.getMinimumTimePerQuestion(config);

    if (timePerQuestion >= minTimeRequired * 2) return 1.0;
    if (timePerQuestion >= minTimeRequired * 1.5) return 0.8;
    if (timePerQuestion >= minTimeRequired) return 0.6;
    if (timePerQuestion >= minTimeRequired * 0.7) return 0.3;
    return 0.1;
  }

  private assessDifficultyAlignment(config: any): number {
    const difficultyScores = { easy: 1.0, medium: 0.8, hard: 0.6 };
    return difficultyScores[config.difficulty as keyof typeof difficultyScores] || 0.7;
  }

  private assessQuestionTypeSuitability(config: any): number {
    const typeScores = {
      'OBJECTIVE': 1.0,
      'SHORT_ANSWER': 0.8,
      'ESSAY': 0.6
    };
    return typeScores[config.type as keyof typeof typeScores] || 0.7;
  }

  private getMinimumTimePerQuestion(config: any): number {
    const baseTimes = {
      'OBJECTIVE': { easy: 1, medium: 1.5, hard: 2 },
      'SHORT_ANSWER': { easy: 3, medium: 5, hard: 7 },
      'ESSAY': { easy: 8, medium: 12, hard: 15 }
    };

    return (baseTimes as any)[config.type]?.[config.difficulty] || 2;
  }

  private generateFeasibilityRecommendations(factors: any): string[] {
    const recommendations: string[] = [];

    if (factors.contentRichness < 0.6) {
      recommendations.push('Insufficient content for the requested number of questions. Add more study materials.');
    }

    if (factors.timeConstraints < 0.6) {
      recommendations.push('Time constraints may be too tight. Consider increasing time limit or reducing question count.');
    }

    if (factors.difficultyAlignment < 0.7) {
      recommendations.push('Consider adjusting difficulty level based on available content and time constraints.');
    }

    if (factors.questionTypeSuitability < 0.7) {
      recommendations.push('Question type may not be optimal for the given constraints. Consider using objective questions for better feasibility.');
    }

    if (factors.overallScore < 0.6) {
      recommendations.push('Overall feasibility is low. Review and adjust exam configuration before proceeding.');
    }

    return recommendations;
  }
}

/**
 * User capability assessment rule
 */
export class UserCapabilityRule implements BusinessRule {
  public id = 'user-capability-assessor';
  public name = 'User Capability Assessor';
  public description = 'Assesses user capabilities and preferences for optimal exam configuration';
  public priority = 70;
  public enabled = true;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { input } = context;
    const user = input.user || {};
    const config = input.config || input;

    const capabilityFactors = this.analyzeUserCapability(user, config);
    
    return {
      passed: capabilityFactors.suitable,
      message: capabilityFactors.suitable ? 
        'User capabilities align well with exam configuration' : 
        'User capabilities may not align with exam configuration',
      severity: capabilityFactors.suitable ? 'info' : 'warning',
      details: capabilityFactors,
      recommendations: this.generateCapabilityRecommendations(capabilityFactors)
    };
  }

  private analyzeUserCapability(user: any, config: any) {
    const factors = {
      experienceLevel: this.assessExperienceLevel(user),
      timeAvailability: this.assessTimeAvailability(user, config),
      preferredDifficulty: this.assessDifficultyPreference(user, config),
      learningStyle: this.assessLearningStyle(user)
    };

    const suitable = Object.values(factors).every(factor => factor >= 0.6);

    return {
      ...factors,
      suitable,
      overallScore: Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length
    };
  }

  private assessExperienceLevel(user: any): number {
    const experience = user.experienceLevel || 'medium';
    const experienceScores = { beginner: 0.6, intermediate: 0.8, advanced: 1.0 };
    return experienceScores[experience as keyof typeof experienceScores] || 0.7;
  }

  private assessTimeAvailability(user: any, config: any): number {
    const availableTime = user.availableTime || 60; // minutes
    const requiredTime = this.estimateRequiredTime(config);
    
    if (availableTime >= requiredTime * 1.2) return 1.0;
    if (availableTime >= requiredTime) return 0.8;
    if (availableTime >= requiredTime * 0.8) return 0.6;
    return 0.3;
  }

  private assessDifficultyPreference(user: any, config: any): number {
    const preferredDifficulty = user.preferredDifficulty || 'medium';
    const difficultyAlignment = preferredDifficulty === config.difficulty ? 1.0 : 0.7;
    return difficultyAlignment;
  }

  private assessLearningStyle(user: any): number {
    const learningStyle = user.learningStyle || 'mixed';
    const styleScores = { visual: 0.8, auditory: 0.8, kinesthetic: 0.8, mixed: 0.9 };
    return styleScores[learningStyle as keyof typeof styleScores] || 0.8;
  }

  private estimateRequiredTime(config: any): number {
    const baseTimePerQuestion = {
      'OBJECTIVE': { easy: 1, medium: 1.5, hard: 2 },
      'SHORT_ANSWER': { easy: 4, medium: 6, hard: 8 },
      'ESSAY': { easy: 10, medium: 15, hard: 20 }
    };

    const timePerQuestion = (baseTimePerQuestion as any)[config.type]?.[config.difficulty] || 2;
    return timePerQuestion * config.numQuestions;
  }

  private generateCapabilityRecommendations(factors: any): string[] {
    const recommendations: string[] = [];

    if (factors.experienceLevel < 0.7) {
      recommendations.push('User may benefit from additional study time or easier difficulty level.');
    }

    if (factors.timeAvailability < 0.7) {
      recommendations.push('Consider adjusting exam duration or question count to match user availability.');
    }

    if (factors.preferredDifficulty < 0.9) {
      recommendations.push('Exam difficulty differs from user preference. Consider alignment for better performance.');
    }

    if (factors.learningStyle < 0.8) {
      recommendations.push('Consider providing study materials in formats that match user learning style.');
    }

    return recommendations;
  }
}

/**
 * Composite exam validation rule - combines multiple validation aspects
 */
export class CompositeExamValidationRule implements BusinessRule {
  public id = 'composite-exam-validator';
  public name = 'Composite Exam Validator';
  public description = 'Comprehensive exam validation combining all validation aspects';
  public priority = 95;
  public enabled = true;

  constructor(
    private configRule: ExamConfigurationRule,
    private materialRule: MaterialQualityRule,
    private feasibilityRule: QuestionFeasibilityRule,
    private capabilityRule: UserCapabilityRule
  ) {}

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const subRules = [
      this.configRule,
      this.materialRule,
      this.feasibilityRule,
      this.capabilityRule
    ];

    const results = await Promise.all(
      subRules.map(rule => rule.evaluate(context))
    );

    const passedCount = results.filter(r => r.passed).length;
    const overallPassed = passedCount === results.length;
    
    const criticalFailures = results.filter(r => !r.passed && r.severity === 'error').length;
    const warnings = results.filter(r => r.severity === 'warning').length;

    const severity = criticalFailures > 0 ? 'error' : (warnings > 0 ? 'warning' : 'info');

    return {
      passed: overallPassed,
      message: `Comprehensive validation: ${passedCount}/${results.length} checks passed`,
      severity,
      details: {
        individualResults: results,
        passedChecks: passedCount,
        totalChecks: results.length,
        criticalFailures,
        warnings
      },
      recommendations: this.combineRecommendations(results)
    };
  }

  private combineRecommendations(results: RuleResult[]): string[] {
    const allRecommendations = results.flatMap(r => r.recommendations || []);
    
    // Remove duplicates and prioritize
    const unique = Array.from(new Set(allRecommendations));
    
    // Sort by priority (error-related recommendations first)
    return unique.sort((a, b) => {
      const aPriority = a.toLowerCase().includes('critical') || a.toLowerCase().includes('error') ? 1 : 0;
      const bPriority = b.toLowerCase().includes('critical') || b.toLowerCase().includes('error') ? 1 : 0;
      return bPriority - aPriority;
    });
  }
}

/**
 * Factory function to create a complete set of exam business rules
 */
export function createExamBusinessRules(): BusinessRule[] {
  const configRule = new ExamConfigurationRule();
  const materialRule = new MaterialQualityRule();
  const feasibilityRule = new QuestionFeasibilityRule();
  const capabilityRule = new UserCapabilityRule();
  const compositeRule = new CompositeExamValidationRule(
    configRule,
    materialRule,
    feasibilityRule,
    capabilityRule
  );

  return [
    compositeRule, // Highest priority - comprehensive check
    configRule,
    materialRule,
    feasibilityRule,
    capabilityRule
  ];
}