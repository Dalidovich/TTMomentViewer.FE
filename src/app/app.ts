import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TabBarComponent } from './components/tab-bar/tab-bar';
import { FullscreenService } from './services/fullscreen.service';
import { TabNavigationService } from './services/tab-navigation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TabBarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  private static readonly lockThreshold = 12;
  private static readonly commitRatio = 0.28;
  private static readonly commitVelocity = 0.5;
  private static readonly edgeResistance = 0.25;
  private static readonly slideDuration = 260;
  private static readonly slideEasing = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

  private readonly fullscreen = inject(FullscreenService);
  private readonly router = inject(Router);
  private readonly tabs = inject(TabNavigationService);
  private readonly tabView = viewChild.required<ElementRef<HTMLElement>>('tabView');

  readonly fullscreenActive = this.fullscreen.active;

  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private offset = 0;
  private tracking = false;
  private horizontal = false;
  private slide: Animation | null = null;

  onTouchStart(event: TouchEvent): void {
    this.reset();

    if (event.touches.length !== 1) return;
    if ((event.target as Element | null)?.closest('[data-no-tab-swipe]')) return;

    this.slide?.cancel();
    this.slide = null;

    const touch = event.touches[0];

    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = event.timeStamp;
    this.tracking = true;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.tracking) return;

    if (event.touches.length !== 1) {
      this.onTouchCancel();
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;

    if (!this.horizontal) {
      if (Math.abs(deltaX) < App.lockThreshold && Math.abs(deltaY) < App.lockThreshold) return;

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        this.tracking = false;
        return;
      }

      this.horizontal = true;
      this.startX = touch.clientX - Math.sign(deltaX) * App.lockThreshold;
    }

    if (event.cancelable) event.preventDefault();

    this.offset = this.resist(touch.clientX - this.startX);
    this.tabView().nativeElement.style.transform = `translateX(${this.offset}px)`;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.horizontal) {
      this.reset();
      return;
    }

    const offset = this.offset;
    const width = this.tabView().nativeElement.getBoundingClientRect().width || 1;
    const velocity = Math.abs(offset) / Math.max(1, event.timeStamp - this.startTime);
    const target = this.tabs.siblingPath(this.router.url, offset < 0 ? 1 : -1);

    this.reset();

    if (
      target !== null &&
      (Math.abs(offset) > width * App.commitRatio || velocity > App.commitVelocity)
    ) {
      this.navigate(target, offset, width);
      return;
    }

    this.slideIn(offset);
  }

  onTouchCancel(): void {
    const offset = this.offset;
    const horizontal = this.horizontal;

    this.reset();

    if (horizontal) this.slideIn(offset);
  }

  private navigate(path: string, offset: number, width: number): void {
    const from = offset < 0 ? width + offset : offset - width;
    const view = this.tabView().nativeElement;

    void this.router.navigateByUrl(path).then((navigated) => {
      if (!navigated) {
        this.slideIn(offset);
        return;
      }

      view.style.transform = `translateX(${from}px)`;
      requestAnimationFrame(() => this.slideIn(from));
    });
  }

  private slideIn(from: number): void {
    const view = this.tabView().nativeElement;

    view.style.transform = '';
    this.slide = view.animate(
      [{ transform: `translateX(${from}px)` }, { transform: 'translateX(0)' }],
      { duration: App.slideDuration, easing: App.slideEasing },
    );
  }

  private resist(delta: number): number {
    const target = this.tabs.siblingPath(this.router.url, delta < 0 ? 1 : -1);

    return target === null ? delta * App.edgeResistance : delta;
  }

  private reset(): void {
    this.tracking = false;
    this.horizontal = false;
    this.offset = 0;
  }
}
