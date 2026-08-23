import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MomentDto } from '../models/moment';
import { PagedResult } from '../models/paged-result';

@Injectable({ providedIn: 'root' })
export class FeedService {
  static readonly pageSize = 10;

  private readonly http = inject(HttpClient);

  private seed = FeedService.createSeed();
  private nextPage = 1;

  readonly moments = signal<MomentDto[]>([]);
  readonly activeIndex = signal(0);
  readonly loading = signal(false);
  readonly empty = signal(false);
  readonly failed = signal(false);
  readonly started = computed(() => this.moments().length > 0);

  loadNextPage(): void {
    if (this.loading() || this.empty()) return;

    this.loading.set(true);
    this.failed.set(false);

    this.http
      .get<PagedResult<MomentDto>>('/api/feed', {
        params: { seed: this.seed, page: this.nextPage, pageSize: FeedService.pageSize },
      })
      .subscribe({
        next: (result) => {
          this.loading.set(false);

          if (result.totalCount === 0) {
            this.empty.set(true);
            return;
          }

          this.moments.update((moments) => [...moments, ...result.items]);

          if (this.nextPage >= result.totalPages) {
            this.seed = FeedService.advanceSeed(this.seed);
            this.nextPage = 1;
          } else {
            this.nextPage += 1;
          }
        },
        error: () => {
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }

  reset(): void {
    this.seed = FeedService.createSeed();
    this.nextPage = 1;
    this.moments.set([]);
    this.activeIndex.set(0);
    this.empty.set(false);
    this.failed.set(false);
  }

  private static createSeed(): number {
    return Math.floor(Math.random() * 2147483647) + 1;
  }

  private static advanceSeed(seed: number): number {
    return seed >= 2147483647 ? 1 : seed + 1;
  }
}
