/**
 * Action Registry for managing automation actions
 */

import { ActionConfig } from './types';

export interface ActionHandler {
  name: string;
  execute: (params: Record<string, any>, context: any) => Promise<any>;
  validate?: (params: Record<string, any>) => boolean;
  description?: string;
}

export class ActionRegistry {
  private static instance: ActionRegistry;
  private actions: Map<string, ActionHandler> = new Map();

  private constructor() {
    this.registerDefaultActions();
  }

  public static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry();
    }
    return ActionRegistry.instance;
  }

  public registerAction(handler: ActionHandler): void {
    this.actions.set(handler.name, handler);
  }

  public getAction(name: string): ActionHandler | undefined {
    return this.actions.get(name);
  }

  public hasAction(name: string): boolean {
    return this.actions.has(name);
  }

  public listActions(): string[] {
    return Array.from(this.actions.keys());
  }

  private registerDefaultActions(): void {
    // API Call Action
    this.registerAction({
      name: 'api_call',
      description: 'Makes an HTTP API call',
      execute: async (params: Record<string, any>, context: any) => {
        const { method = 'GET', url, headers = {}, body } = params;
        const requestInit: RequestInit = {
          method,
          headers,
        };
        
        if (body) {
          requestInit.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, requestInit);
        return await response.json();
      },
      validate: (params: Record<string, any>) => {
        return !!params.url && typeof params.url === 'string';
      }
    });

    // Database Update Action
    this.registerAction({
      name: 'database_update',
      description: 'Updates database records',
      execute: async (params: Record<string, any>, context: any) => {
        // Simulate database operation
        const { table, data, operation = 'update' } = params;
        return {
          success: true,
          operation,
          table,
          affected: Math.floor(Math.random() * 10) + 1,
          data
        };
      },
      validate: (params: Record<string, any>) => {
        return !!params.table && params.data;
      }
    });

    // File Operation Action
    this.registerAction({
      name: 'file_operation',
      description: 'Performs file system operations',
      execute: async (params: Record<string, any>, context: any) => {
        const { operation, path, content } = params;
        // Simulate file operations
        return {
          success: true,
          operation,
          path,
          message: `File ${operation} operation completed`
        };
      },
      validate: (params: Record<string, any>) => {
        return !!params.operation && !!params.path;
      }
    });

    // Notification Action
    this.registerAction({
      name: 'notification',
      description: 'Sends notifications',
      execute: async (params: Record<string, any>, context: any) => {
        const { type = 'info', message, recipient } = params;
        // Simulate notification sending
        return {
          success: true,
          type,
          message,
          recipient,
          timestamp: new Date()
        };
      },
      validate: (params: Record<string, any>) => {
        return !!params.message;
      }
    });

    // Transformation Action
    this.registerAction({
      name: 'transformation',
      description: 'Transforms data',
      execute: async (params: Record<string, any>, context: any) => {
        const { data, transformType, mapping } = params;
        
        switch (transformType) {
          case 'map':
            return Object.keys(data).reduce((result: Record<string, any>, key: string) => {
              const mappedKey = mapping[key] || key;
              result[mappedKey] = data[key];
              return result;
            }, {});
          
          case 'filter':
            return Object.keys(data).reduce((result: Record<string, any>, key: string) => {
              if (mapping[key]) {
                result[key] = data[key];
              }
              return result;
            }, {});
          
          default:
            return data;
        }
      },
      validate: (params: Record<string, any>) => {
        return !!params.data && !!params.transformType;
      }
    });

    // Validation Action
    this.registerAction({
      name: 'validation',
      description: 'Validates data against rules',
      execute: async (params: Record<string, any>, context: any) => {
        const { data, rules } = params;
        const results = rules.map((rule: any) => {
          const { field, operator, value, message } = rule;
          const fieldValue = data[field];
          
          let isValid = false;
          switch (operator) {
            case 'equals':
              isValid = fieldValue === value;
              break;
            case 'not_equals':
              isValid = fieldValue !== value;
              break;
            case 'greater_than':
              isValid = fieldValue > value;
              break;
            case 'less_than':
              isValid = fieldValue < value;
              break;
            case 'contains':
              isValid = fieldValue && fieldValue.toString().includes(value);
              break;
            default:
              isValid = true;
          }
          
          return {
            field,
            operator,
            value,
            isValid,
            message: isValid ? 'Valid' : message || `Field ${field} failed validation`
          };
        });
        
        return {
          success: results.every((r: any) => r.isValid),
          results,
          validCount: results.filter((r: any) => r.isValid).length,
          invalidCount: results.filter((r: any) => !r.isValid).length
        };
      },
      validate: (params: Record<string, any>) => {
        return !!params.data && Array.isArray(params.rules);
      }
    });

    // External Integration Action
    this.registerAction({
      name: 'external_integration',
      description: 'Integrates with external systems',
      execute: async (params: Record<string, any>, context: any) => {
        const { system, operation, payload } = params;
        // Simulate external integration
        return {
          success: true,
          system,
          operation,
          result: `Integration with ${system} completed successfully`,
          timestamp: new Date()
        };
      },
      validate: (params: Record<string, any>) => {
        return !!params.system && !!params.operation;
      }
    });
  }
}

export default ActionRegistry;