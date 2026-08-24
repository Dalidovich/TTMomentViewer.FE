import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MomentDto } from '../../models/moment';
import { MomentService } from '../../services/moment.service';
import { PlaybackService } from '../../services/playback.service';

@Component({
  selector: 'app-moment-card',
  standalone: true,
  templateUrl: './moment-card.html',
  styleUrls: ['./moment-card.scss'],
})
export class MomentCardComponent implements OnDestroy {
  private static readonly indicatorDuration = 700;

  private readonly momentService = inject(MomentService);
  private readonly playback = inject(PlaybackService);

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly progressBar = viewChild.required<ElementRef<HTMLElement>>('progressBar');

  readonly moment = input.required<MomentDto>();
  readonly active = input(false);
  readonly preloaded = input(false);

  readonly soundEnabled = this.playback.soundEnabled;
  readonly failed = signal(false);
  readonly progress = signal(0);
  readonly indicatorVisible = signal(false);

  private readonly source = computed(() =>
    this.preloaded() ? this.momentService.getStreamUrl(this.moment().id) : null,
  );

  private indicatorTimer: ReturnType<typeof setTimeout> | null = null;
  private scrubbing = false;
  private resumeAfterScrub = false;

  constructor() {
    effect(() => {
      const source = this.source();
      const active = this.active();
      const video = this.video().nativeElement;

      if (video.getAttribute('src') !== source) {
        if (source === null) video.removeAttribute('src');
        else video.setAttribute('src', source);

        video.load();
        this.failed.set(false);
        this.progress.set(0);
      }

      if (active && source !== null) {
        this.play();
        return;
      }

      video.pause();
      if (source !== null) video.currentTime = 0;
      this.progress.set(0);
      this.hideIndicator();
    });

    effect(() => {
      this.video().nativeElement.muted = !this.playback.soundEnabled();
    });

    effect(() => {
      const rate = this.playback.playbackRate();
      const video = this.video().nativeElement;

      video.defaultPlaybackRate = rate;
      video.playbackRate = rate;
    });
  }

  ngOnDestroy(): void {
    this.clearIndicatorTimer();
  }

  onSurfaceTap(): void {
    if (!this.playback.soundEnabled()) {
      this.playback.enableSound();
      return;
    }

    const video = this.video().nativeElement;

    if (video.paused) {
      this.play();
      return;
    }

    video.pause();
    this.flashIndicator();
  }

  onSoundToggle(): void {
    this.playback.toggleSound();
  }

  onTimeUpdate(): void {
    if (this.scrubbing) return;

    const video = this.video().nativeElement;

    this.progress.set(video.duration > 0 ? video.currentTime / video.duration : 0);
  }

  onError(): void {
    if (this.source() !== null) this.failed.set(true);
  }

  onScrubStart(event: PointerEvent): void {
    const video = this.video().nativeElement;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;

    this.scrubbing = true;
    this.resumeAfterScrub = !video.paused;
    video.pause();
    this.progressBar().nativeElement.setPointerCapture(event.pointerId);
    this.seek(event);
  }

  onScrubMove(event: PointerEvent): void {
    if (this.scrubbing) this.seek(event);
  }

  onScrubEnd(event: PointerEvent): void {
    if (!this.scrubbing) return;

    const bar = this.progressBar().nativeElement;
    if (bar.hasPointerCapture(event.pointerId)) bar.releasePointerCapture(event.pointerId);

    this.scrubbing = false;
    if (this.resumeAfterScrub) this.play();
  }

  private seek(event: PointerEvent): void {
    const rect = this.progressBar().nativeElement.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const video = this.video().nativeElement;

    video.currentTime = ratio * video.duration;
    this.progress.set(ratio);
  }

  private play(): void {
    this.hideIndicator();
    void this.video()
      .nativeElement.play()
      .catch(() => undefined);
  }

  private flashIndicator(): void {
    this.clearIndicatorTimer();
    this.indicatorVisible.set(true);
    this.indicatorTimer = setTimeout(
      () => this.indicatorVisible.set(false),
      MomentCardComponent.indicatorDuration,
    );
  }

  private hideIndicator(): void {
    this.clearIndicatorTimer();
    this.indicatorVisible.set(false);
  }

  private clearIndicatorTimer(): void {
    if (this.indicatorTimer === null) return;

    clearTimeout(this.indicatorTimer);
    this.indicatorTimer = null;
  }
}
