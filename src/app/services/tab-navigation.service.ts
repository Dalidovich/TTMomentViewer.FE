import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TabNavigationService {
  private readonly paths = ['/feed', '/folders', '/settings'];

  siblingPath(url: string, direction: number): string | null {
    const index = this.currentIndex(url) + direction;

    return index >= 0 && index < this.paths.length ? this.paths[index] : null;
  }

  private currentIndex(url: string): number {
    const path = url.split(/[?#]/)[0];
    const index = this.paths.findIndex((tab) => path === tab || path.startsWith(`${tab}/`));

    return index < 0 ? 0 : index;
  }
}
