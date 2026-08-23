import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MomentDto } from '../../models/moment';
import { PagedResult } from '../../models/paged-result';
import { FolderService } from '../../services/folder.service';
import { MomentService } from '../../services/moment.service';
import { MomentFeedComponent } from '../moment-feed/moment-feed';

@Component({
  selector: 'app-folder-viewer',
  standalone: true,
  imports: [MomentFeedComponent],
  templateUrl: './folder-viewer.html',
  styleUrls: ['./folder-viewer.scss'],
})
export class FolderViewerComponent implements OnInit {
  private static readonly pageSize = 10;

  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly folderService = inject(FolderService);
  private readonly momentService = inject(MomentService);

  private readonly folderId = this.route.snapshot.paramMap.get('folderId') ?? '';
  private readonly momentId = this.route.snapshot.paramMap.get('momentId') ?? '';

  readonly moments = signal<MomentDto[]>([]);
  readonly startIndex = signal(0);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly missing = signal(false);
  readonly message = computed(() => (this.missing() ? 'Moment not found' : null));

  private firstPage = 0;
  private lastPage = 0;
  private totalPages = 0;

  ngOnInit(): void {
    this.load();
  }

  goBack(): void {
    this.location.back();
  }

  onReachStart(): void {
    if (!this.canLoad() || this.firstPage <= 1) return;

    const page = this.firstPage - 1;

    this.loadPage(page, (result) => {
      this.firstPage = page;
      this.moments.update((moments) => [...result.items, ...moments]);
    });
  }

  onReachEnd(): void {
    if (!this.canLoad() || this.lastPage >= this.totalPages) return;

    const page = this.lastPage + 1;

    this.loadPage(page, (result) => {
      this.lastPage = page;
      this.moments.update((moments) => [...moments, ...result.items]);
    });
  }

  onRetry(): void {
    this.failed.set(false);

    if (this.moments().length === 0) this.load();
    else this.onReachEnd();
  }

  private load(): void {
    this.loading.set(true);

    this.momentService.getMoment(this.momentId).subscribe({
      next: (moment) => this.loadStartPage(moment),
      error: () => {
        this.loading.set(false);
        this.missing.set(true);
      },
    });
  }

  private loadStartPage(moment: MomentDto): void {
    const page = Math.floor(moment.index / FolderViewerComponent.pageSize) + 1;

    this.folderService.getMoments(this.folderId, page, FolderViewerComponent.pageSize).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.firstPage = page;
        this.lastPage = page;
        this.totalPages = result.totalPages;
        this.startIndex.set(moment.index - (page - 1) * FolderViewerComponent.pageSize);
        this.moments.set(result.items);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  private loadPage(page: number, apply: (result: PagedResult<MomentDto>) => void): void {
    this.loading.set(true);

    this.folderService.getMoments(this.folderId, page, FolderViewerComponent.pageSize).subscribe({
      next: (result) => {
        this.loading.set(false);
        apply(result);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  private canLoad(): boolean {
    return !this.loading() && !this.failed() && !this.missing() && this.lastPage > 0;
  }
}
