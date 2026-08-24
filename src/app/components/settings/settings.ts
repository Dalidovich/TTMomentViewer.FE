import { Component, inject } from '@angular/core';
import { PlaybackService } from '../../services/playback.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsComponent {
  private readonly playback = inject(PlaybackService);

  readonly minRate = PlaybackService.minPlaybackRate;
  readonly maxRate = PlaybackService.maxPlaybackRate;
  readonly rateStep = PlaybackService.playbackRateStep;
  readonly playbackRate = this.playback.playbackRate;

  onPlaybackRateInput(event: Event): void {
    this.playback.setPlaybackRate(Number((event.target as HTMLInputElement).value));
  }

  onPlaybackRateReset(): void {
    this.playback.resetPlaybackRate();
  }
}
