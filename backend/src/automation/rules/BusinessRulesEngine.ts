import { EventEmitter } from 'events';
import { BusinessRule, RuleContext, RuleResult, RuleExecutionResult } from '../core/types';
import { BusinessRuleError, ValidationError } from '../../shared/errors';
import winston from 'winston';

/**
 * Business Rules Engine - Evaluates business rules and makes automated decisions
 * Supports complex rule chains, conditional logic, and rule prioritization
 */
export class BusinessRulesEngine extends EventEmitter {
  private logger: winston.Logger;
  private rules = new Map<string, BusinessRule>();
  private ruleChains = new Map<string, string[]>(); // chainName -> ruleIds
  private ruleCache = new Map<string, { result: RuleResult; timestamp: number }>();
  private cacheTimeout = 300000; // 5 minutes

  constructor() {
    super();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/business-rules.log' })
      ]
    });

    this.setupEventHandlers();
  }

  /**
   * Register a business rule
   */
  registerRule(rule: BusinessRule): void {
    if (this.rules.has(rule.id)) {
      this.logger.warn(`Rule ${rule.id} is being overwritten`);
    }

    this.rules.set(rule.id, rule);
    this.logger.info(`Business rule registered: ${rule.id}`, {
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      enabled: rule.enabled
    });
  }

  /**
   * Register multiple rules
   */
  registerRules(rules: BusinessRule[]): void {
    rules.forEach(rule => this.registerRule(rule));
  }

  /**
   * Create a rule chain - executes rules in sequence
   */
  createRuleChain(chainName: string, ruleIds: string[], description?: string): void {
    // Validate that all rules exist
    for (const ruleId of ruleIds) {
      if (!this.rules.has(ruleId)) {
        throw new BusinessRuleError('RULE_NOT_FOUND', 
          `Cannot create chain '${chainName}': rule '${ruleId}' not found`);
      }
    }

    this.ruleChains.set(chainName, ruleIds);
    this.logger.info(`Rule chain created: ${chainName}`, {
      description,
      ruleCount: ruleIds.length,
      rules: ruleIds
    });
  }

  /**
   * Evaluate a single business rule
   */
  async evaluateRule(ruleId: string, context: RuleContext): Promise<RuleResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new BusinessRuleError('RULE_NOT_FOUND', `Rule '${ruleId}' not found`);
    }

    if (!rule.enabled) {
      return {
        passed: true,
        message: `Rule '${rule.name}' is disabled`,
        severity: 'info'
      };
    }

    const cacheKey = this.generateCacheKey(ruleId, context);
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startTime = Date.now();
      const result = await rule.evaluate(context);
      const executionTime = Date.now() - startTime;

      // Enhance result with metadata
      const enhancedResult: RuleResult = {
        ...result,
        details: {
          ...result.details,
          ruleId: rule.id,
          ruleName: rule.name,
          executionTime,
          timestamp: new Date().toISOString()
        }
      };

      // Cache successful results
      if (result.passed) {
        this.setCachedResult(cacheKey, enhancedResult);
      }

      this.logger.debug(`Rule evaluated: ${ruleId}`, {
        passed: result.passed,
        severity: result.severity,
        executionTime
      });

      return enhancedResult;

    } catch (error) {
      this.logger.error(`Rule evaluation failed: ${ruleId}`, {
        error: (error as Error).message,
        context: this.sanitizeContext(context)
      });

      throw new BusinessRuleError('RULE_EVALUATION_FAILED',
        `Failed to evaluate rule '${rule.name}': ${(error as Error).message}`,
        { ruleId, context: this.sanitizeContext(context), originalError: error }
      );
    }
  }

  /**
   * Evaluate multiple rules
   */
  async evaluateRules(ruleIds: string[], context: RuleContext): Promise<RuleExecutionResult> {
    const results: RuleResult[] = [];
    const errors: Array<{ ruleId: string; error: string }> = [];
    const startTime = Date.now();

    for (const ruleId of ruleIds) {
      try {
        const result = await this.evaluateRule(ruleId, context);
        results.push(result);
      } catch (error) {
        errors.push({
          ruleId,
          error: (error as Error).message
        });
      }
    }

    const executionTime = Date.now() - startTime;
    const overallPassed = results.every(r => r.passed) && errors.length === 0;
    const criticalFailures = results.filter(r => !r.passed && r.severity === 'error').length;

    const executionResult: RuleExecutionResult = {
      success: errors.length === 0,
      overallPassed,
      results,
      errors,
      executionTime,
      summary: {
        totalRules: ruleIds.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        criticalFailures,
        warnings: results.filter(r => r.severity === 'warning').length
      }
    };

    this.emit('rulesEvaluated', { 
      ruleIds, 
      context, 
      result: executionResult 
    });

    return executionResult;
  }

  /**
   * Evaluate a rule chain
   */
  async evaluateRuleChain(chainName: string, context: RuleContext): Promise<RuleExecutionResult> {
    const ruleIds = this.ruleChains.get(chainName);
    if (!ruleIds) {
      throw new BusinessRuleError('CHAIN_NOT_FOUND', `Rule chain '${chainName}' not found`);
    }

    this.logger.info(`Evaluating rule chain: ${chainName}`, {
      ruleCount: ruleIds.length,
      contextKeys: Object.keys(context.input || {})
    });

    const chainContext = {
      ...context,
      metadata: {
        ...context.metadata,
        chainName,
        chainExecutionId: Date.now().toString()
      }
    };

    const result = await this.evaluateRules(ruleIds, chainContext);

    // Add chain-specific metadata
    result.metadata = {
      ...result.metadata,
      chainName,
      ruleChain: ruleIds
    };

    return result;
  }

  /**
   * Evaluate all enabled rules
   */
  async evaluateAllRules(context: RuleContext): Promise<RuleExecutionResult> {
    const enabledRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    const ruleIds = enabledRules.map(rule => rule.id);
    return this.evaluateRules(ruleIds, context);
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): BusinessRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): BusinessRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }

    rule.enabled = enabled;
    this.logger.info(`Rule ${enabled ? 'enabled' : 'disabled'}: ${ruleId}`);
    
    // Clear cache when rule state changes
    this.clearRuleCache(ruleId);
    
    return true;
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    const existed = this.rules.delete(ruleId);
    if (existed) {
      this.clearRuleCache(ruleId);
      this.logger.info(`Rule removed: ${ruleId}`);
    }
    return existed;
  }

  /**
   * Get rule chains
   */
  getRuleChains(): Record<string, string[]> {
    return Object.fromEntries(this.ruleChains);
  }

  /**
   * Clear rule cache
   */
  clearCache(): void {
    this.ruleCache.clear();
    this.logger.info('Business rules cache cleared');
  }

  /**
   * Get engine statistics
   */
  getStats() {
    const rules = this.getAllRules();
    const enabledRules = rules.filter(r => r.enabled);
    
    return {
      totalRules: rules.length,
      enabledRules: enabledRules.length,
      disabledRules: rules.length - enabledRules.length,
      ruleChains: this.ruleChains.size,
      cacheSize: this.ruleCache.size,
      rulesByPriority: this.groupRulesByPriority(rules),
      rulesBySeverity: this.analyzeRuleSeverities(rules)
    };
  }

  /**
   * Shutdown the engine
   */
  shutdown(): void {
    this.removeAllListeners();
    this.clearCache();
    this.logger.info('Business rules engine shutdown complete');
  }

  // Private methods

  private setupEventHandlers(): void {
    this.on('rulesEvaluated', (data) => {
      const { ruleIds, result } = data;
      this.logger.info('Rules evaluation completed', {
        ruleCount: ruleIds.length,
        passed: result.summary.passed,
        failed: result.summary.failed,
        executionTime: result.executionTime
      });
    });
  }

  private generateCacheKey(ruleId: string, context: RuleContext): string {
    const contextStr = JSON.stringify({
      input: context.input,
      metadata: context.metadata
    });
    return `${ruleId}:${Buffer.from(contextStr).toString('base64')}`;
  }

  private getCachedResult(cacheKey: string): RuleResult | null {
    const cached = this.ruleCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache entry has expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.ruleCache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  private setCachedResult(cacheKey: string, result: RuleResult): void {
    this.ruleCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  private clearRuleCache(ruleId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.ruleCache.entries()) {
      if (key.startsWith(`${ruleId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.ruleCache.delete(key));
  }

  private sanitizeContext(context: RuleContext): any {
    // Remove sensitive data from context for logging
    const sanitized = { ...context };
    
    if (sanitized.input && typeof sanitized.input === 'object') {
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key'];
      sanitized.input = this.removeSensitiveData(sanitized.input, sensitiveFields);
    }

    return sanitized;
  }

  private removeSensitiveData(obj: any, sensitiveFields: string[]): any {
    const result = { ...obj };
    
    for (const field of sensitiveFields) {
      if (field in result) {
        result[field] = '[REDACTED]';
      }
    }

    // Recursively process nested objects
    for (const key in result) {
      if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = this.removeSensitiveData(result[key], sensitiveFields);
      }
    }

    return result;
  }

  private groupRulesByPriority(rules: BusinessRule[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    rules.forEach(rule => {
      const priorityGroup = rule.priority >= 80 ? 'high' : 
                           rule.priority >= 50 ? 'medium' : 'low';
      groups[priorityGroup] = (groups[priorityGroup] || 0) + 1;
    });

    return groups;
  }

  private analyzeRuleSeverities(rules: BusinessRule[]): Record<string, number> {
    const severities: Record<string, number> = {};
    
    // This is a simplified analysis - in practice, you'd want to run each rule
    // to get its actual severity distribution
    rules.forEach(rule => {
      // For now, assume rules can have different severities based on their purpose
      // In a real implementation, you'd track this during rule execution
      const severity = this.inferRuleSeverity(rule);
      severities[severity] = (severities[severity] || 0) + 1;
    });

    return severities;
  }

  private inferRuleSeverity(rule: BusinessRule): string {
    // Simple heuristic to infer rule severity based on name/description
    const text = `${rule.name} ${rule.description}`.toLowerCase();
    
    if (text.includes('critical') || text.includes('security') || text.includes('compliance')) {
      return 'error';
    } else if (text.includes('warning') || text.includes('caution') || text.includes('performance')) {
      return 'warning';
    } else {
      return 'info';
    }
  }
}

export default BusinessRulesEngine;