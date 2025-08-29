import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

interface AsyncMemoCache {
  [key: string]: {
    subject: BehaviorSubject<any>;
    subscription: any;
    timestamp: number;
  };
}

@Pipe({
  name: 'asyncMemo',
  pure: false,
  standalone: true
})
export class AsyncMemoPipe implements PipeTransform, OnDestroy {
  private cache: AsyncMemoCache = {};
  private readonly TTL = 10 * 60 * 1000; // 10 minutes

  constructor(private cdr: ChangeDetectorRef) {}

  transform<T>(
    source$: Observable<T> | null | undefined, 
    ...args: any[]
  ): T | null {
    if (!source$) return null;

    const key = this.createKey(source$, args);
    const now = Date.now();

    // Check if cached observable exists and is still valid
    if (this.cache[key]) {
      const cached = this.cache[key];
      if ((now - cached.timestamp) < this.TTL) {
        return cached.subject.value;
      } else {
        // Clean up expired cache
        if (cached.subscription) {
          cached.subscription.unsubscribe();
        }
        delete this.cache[key];
      }
    }

    // Create new cached observable
    const subject = new BehaviorSubject<T | null>(null);
    
    const subscription = source$.pipe(
      distinctUntilChanged(),
      catchError(error => {
        console.error('AsyncMemoPipe error:', error);
        return of(null);
      })
    ).subscribe({
      next: (value) => {
        subject.next(value);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('AsyncMemoPipe subscription error:', error);
        subject.next(null);
      }
    });

    this.cache[key] = {
      subject,
      subscription,
      timestamp: now
    };

    return subject.value;
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    Object.values(this.cache).forEach(cached => {
      if (cached.subscription) {
        cached.subscription.unsubscribe();
      }
    });
    this.cache = {};
  }

  private createKey(source$: Observable<any>, args: any[]): string {
    // Use the observable's toString and args to create a key
    const sourceKey = source$.constructor.name + '_' + Date.now().toString(36);
    const argsKey = JSON.stringify(args);
    return `${sourceKey}:${argsKey}`;
  }
}