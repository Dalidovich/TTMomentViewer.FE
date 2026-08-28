import { Component, OnInit, inject, signal } from '@angular/core';
import { LibraryStatsDto } from '../../models/library-stats';
import { LibraryService } from '../../services/library.service';
import { PlaybackService } from '../../services/playback.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsComponent implements OnInit {
  private static readonly sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

  private readonly playback = inject(PlaybackService);
  private readonly library = inject(LibraryService);

  readonly minRate = PlaybackService.minPlaybackRate;
  readonly maxRate = PlaybackService.maxPlaybackRate;
  readonly rateStep = PlaybackService.playbackRateStep;
  readonly playbackRate = this.playback.playbackRate;
  readonly autoAdvance = this.playback.autoAdvance;

  readonly stats = signal<LibraryStatsDto | null>(null);
  readonly statsLoading = signal(false);
  readonly statsFailed = signal(false);

  ngOnInit(): void {
    this.loadStats();
  }

  onPlaybackRateInput(event: Event): void {
    this.playback.setPlaybackRate(Number((event.target as HTMLInputElement).value));
  }

  onPlaybackRateReset(): void {
    this.playback.resetPlaybackRate();
  }

  onAutoAdvanceChange(event: Event): void {
    this.playback.setAutoAdvance((event.target as HTMLInputElement).checked);
  }

  onExport(): void {
    const stats = this.stats();
    if (stats === null || stats.momentCount === 0) return;

    window.location.assign(this.library.getExportUrl());
  }

  retryStats(): void {
    this.loadStats();
  }

  formatSize(bytes: number): string {
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < SettingsComponent.sizeUnits.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    const fractionDigits = unitIndex === 0 || value >= 100 ? 0 : 1;

    return `${value.toFixed(fractionDigits)} ${SettingsComponent.sizeUnits[unitIndex]}`;
  }

  private loadStats(): void {
    if (this.statsLoading()) return;

    this.statsLoading.set(true);
    this.statsFailed.set(false);

    this.library.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsLoading.set(false);
        this.statsFailed.set(true);
      },
    });
  }
}
