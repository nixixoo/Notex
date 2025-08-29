import { Pipe, PipeTransform } from '@angular/core';

interface CacheEntry {
  args: any[];
  result: any;
  timestamp: number;
}

@Pipe({
  name: 'memo',
  pure: true,
  standalone: true
})
export class MemoPipe implements PipeTransform {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  transform<T>(fn: (...args: any[]) => T, ...args: any[]): T {
    const key = this.createKey(fn, args);
    const now = Date.now();
    
    // Check if cached result exists and is still valid
    const cached = this.cache.get(key);
    if (cached && (now - cached.timestamp) < this.TTL) {
      // Verify args haven't changed
      if (this.argsEqual(cached.args, args)) {
        return cached.result;
      }
    }

    // Compute new result
    const result = fn(...args);
    
    // Cache the result
    this.cache.set(key, {
      args: [...args],
      result,
      timestamp: now
    });

    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache(now);
    }

    return result;
  }

  private createKey(fn: Function, args: any[]): string {
    const fnStr = fn.toString().substring(0, 100); // Limit function string length
    const argsStr = JSON.stringify(args);
    return `${fnStr}:${argsStr}`;
  }

  private argsEqual(args1: any[], args2: any[]): boolean {
    if (args1.length !== args2.length) return false;
    
    for (let i = 0; i < args1.length; i++) {
      if (args1[i] !== args2[i]) {
        // Deep comparison for objects
        if (typeof args1[i] === 'object' && typeof args2[i] === 'object') {
          if (JSON.stringify(args1[i]) !== JSON.stringify(args2[i])) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    
    return true;
  }

  private cleanupCache(now: number): void {
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}