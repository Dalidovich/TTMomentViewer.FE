import {
  Component,
  ElementRef,
  OnDestroy,
  afterRenderEffect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { MomentDto } from '../../models/moment';
import { MomentCardComponent } from '../moment-card/moment-card';

@Component({
  selector: 'app-moment-feed',
  standalone: true,
  imports: [MomentCardComponent],
  templateUrl: './moment-feed.html',
  styleUrls: ['./moment-feed.scss'],
})
export class MomentFeedComponent implements OnDestroy {
  private static readonly activationRatio = 0.6;
  private static readonly loadThreshold = 3;

  readonly moments = input.required<MomentDto[]>();
  readonly startIndex = input(0);
  readonly loading = input(false);
  readonly failed = input(false);
  readonly message = input<string | null>(null);

  readonly activeIndexChange = output<number>();
  readonly reachStart = output<void>();
  readonly reachEnd = output<void>();
  readonly retry = output<void>();

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly cards = viewChildren<MomentCardComponent, ElementRef<HTMLElement>>('card', {
    read: ElementRef,
  });

  readonly activeIndex = signal(0);

  private observer: IntersectionObserver | null = null;
  private observed: HTMLElement[] = [];
  private anchorId: string | null = null;
  private positioned = false;

  constructor() {
    afterRenderEffect(() => {
      this.moments();
      this.cards();

      this.syncObserver();
      this.syncPosition();
      untracked(() => this.requestPages());
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  isPreloaded(index: number): boolean {
    return Math.abs(index - this.activeIndex()) <= 1;
  }

  private syncObserver(): void {
    const elements = this.cards().map((card) => card.nativeElement);

    this.observer ??= new IntersectionObserver((entries) => this.onIntersect(entries), {
      root: this.scroller().nativeElement,
      threshold: MomentFeedComponent.activationRatio,
    });

    for (const element of this.observed) {
      if (!elements.includes(element)) this.observer.unobserve(element);
    }

    for (const element of elements) {
      if (!this.observed.includes(element)) this.observer.observe(element);
    }

    this.observed = elements;
  }

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const index = this.observed.indexOf(entry.target as HTMLElement);
      if (index < 0 || index === untracked(this.activeIndex)) continue;

      this.activeIndex.set(index);
      this.activeIndexChange.emit(index);
      this.requestPages();
    }
  }

  private syncPosition(): void {
    const moments = this.moments();
    const scroller = this.scroller().nativeElement;

    if (moments.length === 0) {
      this.anchorId = null;
      this.positioned = false;
      return;
    }

    if (!this.positioned) {
      const start = Math.min(Math.max(this.startIndex(), 0), moments.length - 1);

      this.positioned = true;
      this.anchorId = moments[0].id;
      scroller.scrollTop = start * scroller.clientHeight;
      untracked(() => this.activeIndex.set(start));
      return;
    }

    if (moments[0].id === this.anchorId) return;

    const shift = moments.findIndex((moment) => moment.id === this.anchorId);

    this.anchorId = moments[0].id;
    if (shift <= 0) return;

    scroller.scrollTop += shift * scroller.clientHeight;
    untracked(() => this.activeIndex.update((index) => index + shift));
  }

  private requestPages(): void {
    const total = untracked(this.moments).length;
    if (total === 0) return;

    const index = untracked(this.activeIndex);

    if (index >= total - 1 - MomentFeedComponent.loadThreshold) this.reachEnd.emit();
    if (index <= MomentFeedComponent.loadThreshold) this.reachStart.emit();
  }
}
