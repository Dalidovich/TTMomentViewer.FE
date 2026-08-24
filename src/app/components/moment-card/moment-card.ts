import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MomentDto } from '../../models/moment';
import { MomentService } from '../../services/moment.service';
import { PlaybackService } from '../../services/playback.service';

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);

  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

@Component({
  selector: 'app-moment-card',
  standalone: true,
  imports: [RouterLink],
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

  readonly ended = output<void>();

  readonly soundEnabled = this.playback.soundEnabled;
  readonly autoAdvance = this.playback.autoAdvance;
  readonly failed = signal(false);
  readonly progress = signal(0);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly indicatorVisible = signal(false);

  readonly currentLabel = computed(() => formatTime(this.currentTime()));
  readonly durationLabel = computed(() => formatTime(this.duration()));

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
        this.currentTime.set(0);
        this.duration.set(0);
      }

      if (active && source !== null) {
        this.play();
        return;
      }

      video.pause();
      if (source !== null) video.currentTime = 0;
      this.progress.set(0);
      this.currentTime.set(0);
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

  replay(): void {
    this.video().nativeElement.currentTime = 0;
    this.play();
  }

  onSoundToggle(): void {
    this.playback.toggleSound();
  }

  onLoadedMetadata(): void {
    const video = this.video().nativeElement;

    this.duration.set(Number.isFinite(video.duration) ? video.duration : 0);
  }

  onTimeUpdate(): void {
    if (this.scrubbing) return;

    const video = this.video().nativeElement;

    this.currentTime.set(video.currentTime);
    this.progress.set(video.duration > 0 ? video.currentTime / video.duration : 0);
  }

  onEnded(): void {
    if (!this.active()) return;

    this.ended.emit();
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
    this.currentTime.set(video.currentTime);
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
