import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  EmbeddedViewRef,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { Subject, fromEvent, combineLatest } from 'rxjs';
import { throttleTime, takeUntil, startWith } from 'rxjs/operators';

interface VirtualScrollItem {
  index: number;
  data: any;
  viewRef?: EmbeddedViewRef<any>;
}

@Directive({
  selector: '[appVirtualScroll]',
  standalone: true
})
export class VirtualScrollDirective implements OnInit, OnDestroy {
  @Input() appVirtualScrollItems: any[] = [];
  @Input() appVirtualScrollItemHeight = 50;
  @Input() appVirtualScrollBuffer = 5;
  
  private destroy$ = new Subject<void>();
  private visibleItems: VirtualScrollItem[] = [];
  private scrollContainer!: HTMLElement;
  private itemContainer!: HTMLElement;

  constructor(
    private elementRef: ElementRef,
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.setupScrollContainer();
    this.setupScrollListener();
    this.updateVisibleItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupScrollContainer(): void {
    this.scrollContainer = this.elementRef.nativeElement;
    this.scrollContainer.style.overflow = 'auto';
    this.scrollContainer.style.position = 'relative';

    // Create item container
    this.itemContainer = document.createElement('div');
    this.itemContainer.style.position = 'relative';
    this.itemContainer.style.height = `${this.appVirtualScrollItems.length * this.appVirtualScrollItemHeight}px`;
    
    this.scrollContainer.appendChild(this.itemContainer);
  }

  private setupScrollListener(): void {
    this.ngZone.runOutsideAngular(() => {
      const scroll$ = fromEvent(this.scrollContainer, 'scroll').pipe(
        throttleTime(16), // ~60fps
        startWith(null)
      );

      const resize$ = fromEvent(window, 'resize').pipe(
        throttleTime(100),
        startWith(null)
      );

      combineLatest([scroll$, resize$])
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.ngZone.run(() => {
            this.updateVisibleItems();
          });
        });
    });
  }

  private updateVisibleItems(): void {
    const containerHeight = this.scrollContainer.clientHeight;
    const scrollTop = this.scrollContainer.scrollTop;
    
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / this.appVirtualScrollItemHeight) - this.appVirtualScrollBuffer
    );
    
    const visibleCount = Math.ceil(containerHeight / this.appVirtualScrollItemHeight) + 
                        this.appVirtualScrollBuffer * 2;
    
    const endIndex = Math.min(
      this.appVirtualScrollItems.length,
      startIndex + visibleCount
    );

    // Clear existing views
    this.viewContainerRef.clear();
    this.visibleItems = [];

    // Create new views for visible items
    for (let i = startIndex; i < endIndex; i++) {
      const item: VirtualScrollItem = {
        index: i,
        data: this.appVirtualScrollItems[i]
      };

      const context = {
        $implicit: item.data,
        index: i
      };

      const viewRef = this.viewContainerRef.createEmbeddedView(
        this.templateRef,
        context
      );

      // Position the view
      const element = viewRef.rootNodes[0];
      if (element) {
        element.style.position = 'absolute';
        element.style.top = `${i * this.appVirtualScrollItemHeight}px`;
        element.style.left = '0';
        element.style.right = '0';
        element.style.height = `${this.appVirtualScrollItemHeight}px`;
      }

      item.viewRef = viewRef;
      this.visibleItems.push(item);
    }

    this.cdr.detectChanges();
  }
}