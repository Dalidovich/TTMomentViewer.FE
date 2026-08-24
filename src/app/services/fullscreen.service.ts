import { Injectable, signal } from '@angular/core';

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

type LegacyVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

@Injectable({ providedIn: 'root' })
export class FullscreenService {
  private static readonly landscape = 'landscape';

  readonly active = signal(false);

  constructor() {
    document.addEventListener('fullscreenchange', () => this.sync());
  }

  async toggle(video: HTMLVideoElement): Promise<void> {
    if (document.fullscreenElement !== null) {
      await this.exit();
      return;
    }

    await this.enter(video);
  }

  async exit(): Promise<void> {
    this.unlockOrientation();

    if (document.fullscreenElement === null) return;

    try {
      await document.exitFullscreen();
    } catch {
      return;
    }
  }

  private async enter(video: HTMLVideoElement): Promise<void> {
    const root = document.documentElement;
    const legacy = video as LegacyVideo;

    if (root.requestFullscreen === undefined) {
      legacy.webkitEnterFullscreen?.();
      return;
    }

    try {
      await root.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      legacy.webkitEnterFullscreen?.();
      return;
    }

    this.sync();
    await this.lockOrientation();
  }

  private async lockOrientation(): Promise<void> {
    try {
      await (screen.orientation as LockableOrientation | undefined)?.lock?.(
        FullscreenService.landscape,
      );
    } catch {
      return;
    }
  }

  private unlockOrientation(): void {
    try {
      (screen.orientation as LockableOrientation | undefined)?.unlock?.();
    } catch {
      return;
    }
  }

  private sync(): void {
    const active = document.fullscreenElement !== null;

    this.active.set(active);
    if (!active) this.unlockOrientation();
  }
}
