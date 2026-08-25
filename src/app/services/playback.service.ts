import { Injectable, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlaybackService {
  static readonly minPlaybackRate = 0.5;
  static readonly maxPlaybackRate = 2.5;
  static readonly playbackRateStep = 0.1;
  static readonly defaultPlaybackRate = 1;

  static readonly defaultAutoAdvance = false;

  private static readonly playbackRateKey = 'ttmomentviewer.playbackRate';
  private static readonly autoAdvanceKey = 'ttmomentviewer.autoAdvance';

  readonly soundEnabled = signal(false);
  readonly playbackRate = signal(PlaybackService.readStoredPlaybackRate());
  readonly autoAdvance = signal(PlaybackService.readStoredAutoAdvance());

  constructor() {
    effect(() => {
      const rate = this.playbackRate();

      try {
        localStorage.setItem(PlaybackService.playbackRateKey, String(rate));
      } catch {
        return;
      }
    });

    effect(() => {
      const enabled = this.autoAdvance();

      try {
        localStorage.setItem(PlaybackService.autoAdvanceKey, String(enabled));
      } catch {
        return;
      }
    });
  }

  enableSound(): void {
    this.soundEnabled.set(true);
  }

  toggleSound(): void {
    this.soundEnabled.update((enabled) => !enabled);
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate.set(PlaybackService.normalizePlaybackRate(rate));
  }

  setAutoAdvance(enabled: boolean): void {
    this.autoAdvance.set(enabled);
  }

  toggleAutoAdvance(): void {
    this.autoAdvance.update((enabled) => !enabled);
  }

  resetPlaybackRate(): void {
    this.playbackRate.set(PlaybackService.defaultPlaybackRate);
  }

  private static readStoredPlaybackRate(): number {
    try {
      const stored = localStorage.getItem(PlaybackService.playbackRateKey);

      return stored === null
        ? PlaybackService.defaultPlaybackRate
        : PlaybackService.normalizePlaybackRate(Number(stored));
    } catch {
      return PlaybackService.defaultPlaybackRate;
    }
  }

  private static readStoredAutoAdvance(): boolean {
    try {
      const stored = localStorage.getItem(PlaybackService.autoAdvanceKey);

      return stored === null ? PlaybackService.defaultAutoAdvance : stored === 'true';
    } catch {
      return PlaybackService.defaultAutoAdvance;
    }
  }

  private static normalizePlaybackRate(rate: number): number {
    if (!Number.isFinite(rate)) return PlaybackService.defaultPlaybackRate;

    const clamped = Math.min(
      PlaybackService.maxPlaybackRate,
      Math.max(PlaybackService.minPlaybackRate, rate),
    );

    const stepped =
      Math.round(clamped / PlaybackService.playbackRateStep) * PlaybackService.playbackRateStep;

    return Number(stepped.toFixed(2));
  }
}
