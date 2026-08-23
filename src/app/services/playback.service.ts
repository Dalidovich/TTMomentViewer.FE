import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlaybackService {
  readonly soundEnabled = signal(false);

  enableSound(): void {
    this.soundEnabled.set(true);
  }

  toggleSound(): void {
    this.soundEnabled.update((enabled) => !enabled);
  }
}
