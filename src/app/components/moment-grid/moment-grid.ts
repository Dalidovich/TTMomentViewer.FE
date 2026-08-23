import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FolderDto } from '../../models/folder';
import { MomentDto } from '../../models/moment';
import { FolderService } from '../../services/folder.service';
import { MomentService } from '../../services/moment.service';

@Component({
  selector: 'app-moment-grid',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './moment-grid.html',
  styleUrls: ['./moment-grid.scss'],
})
export class MomentGridComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly pageSize = 30;
  private static readonly prefetchMargin = 400;

  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly folderService = inject(FolderService);
  private readonly momentService = inject(MomentService);
  private readonly injector = inject(Injector);

  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');

  readonly folderId = this.route.snapshot.paramMap.get('folderId') ?? '';
  readonly folder = signal<FolderDto | null>(null);
  readonly moments = signal<MomentDto[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly missing = signal(false);
  readonly completed = signal(false);

  private readonly brokenThumbnails = signal(new Set<string>());
  private nextPage = 1;
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.folderService.getFolder(this.folderId).subscribe({
      next: (folder) => this.folder.set(folder),
      error: () => this.missing.set(true),
    });

    this.loadNextPage();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(() => this.loadWhenSentinelNear(), {
      rootMargin: `${MomentGridComponent.prefetchMargin}px`,
    });

    this.observer.observe(this.sentinel().nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  thumbnailUrl(moment: MomentDto): string {
    return this.momentService.getThumbnailUrl(moment.id);
  }

  hasThumbnail(moment: MomentDto): boolean {
    return !this.brokenThumbnails().has(moment.id);
  }

  onThumbnailError(momentId: string): void {
    this.brokenThumbnails.update((broken) => new Set(broken).add(momentId));
  }

  goBack(): void {
    this.location.back();
  }

  retry(): void {
    this.failed.set(false);
    this.loadNextPage();
  }

  private loadWhenSentinelNear(): void {
    const { top } = this.sentinel().nativeElement.getBoundingClientRect();

    if (top <= window.innerHeight + MomentGridComponent.prefetchMargin) this.loadNextPage();
  }

  private loadNextPage(): void {
    if (this.loading() || this.failed() || this.completed() || this.missing()) return;

    this.loading.set(true);

    this.folderService
      .getMoments(this.folderId, this.nextPage, MomentGridComponent.pageSize)
      .subscribe({
        next: (result) => {
          this.moments.update((moments) => [...moments, ...result.items]);
          this.loading.set(false);

          if (result.page >= result.totalPages) {
            this.completed.set(true);
            return;
          }

          this.nextPage = result.page + 1;
          afterNextRender(() => this.loadWhenSentinelNear(), { injector: this.injector });
        },
        error: (error: { status?: number }) => {
          this.loading.set(false);

          if (error.status === 404) this.missing.set(true);
          else this.failed.set(true);
        },
      });
  }
}
