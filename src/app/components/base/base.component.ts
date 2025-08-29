import { 
  ChangeDetectionStrategy, 
  Component, 
  OnDestroy, 
  inject,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';

@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export abstract class BaseComponent implements OnDestroy {
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly destroy$ = new Subject<void>();

  // Utility method for reactive subscriptions
  protected takeUntilDestroyed() {
    return takeUntilDestroyed(this.destroyRef);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}