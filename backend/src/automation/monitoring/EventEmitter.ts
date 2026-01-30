export interface EventListener {
  (data?: any): void;
}

export interface EventDefinition {
  name: string;
  description: string;
  payload?: any;
}

export class EventEmitter {
  private listeners = new Map<string, Set<EventListener>>();
  private eventHistory: Array<{ event: string; data?: any; timestamp: Date }> = [];

  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }

    // Store event in history
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date()
    });

    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }
  }

  once(event: string, listener: EventListener): void {
    const onceListener: EventListener = (data) => {
      listener(data);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  getListenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }

  getEventHistory(limit?: number): Array<{ event: string; data?: any; timestamp: Date }> {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  getRegisteredEvents(): string[] {
    return Array.from(this.listeners.keys());
  }
}