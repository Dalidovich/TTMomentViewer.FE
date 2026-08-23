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
import { RouterLink } from '@angular/router';
import { FolderDto } from '../../models/folder';
import { FolderService } from '../../services/folder.service';

@Component({
  selector: 'app-folder-grid',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './folder-grid.html',
  styleUrls: ['./folder-grid.scss'],
})
export class FolderGridComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly pageSize = 30;
  private static readonly prefetchMargin = 400;

  private readonly folderService = inject(FolderService);
  private readonly injector = inject(Injector);

  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');

  readonly folders = signal<FolderDto[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly completed = signal(false);

  private readonly brokenCovers = signal(new Set<string>());
  private nextPage = 1;
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.loadNextPage();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(() => this.loadWhenSentinelNear(), {
      rootMargin: `${FolderGridComponent.prefetchMargin}px`,
    });

    this.observer.observe(this.sentinel().nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  coverUrl(folder: FolderDto): string {
    return this.folderService.getThumbnailUrl(folder.id);
  }

  hasCover(folder: FolderDto): boolean {
    return folder.coverMomentId !== null && !this.brokenCovers().has(folder.id);
  }

  onCoverError(folderId: string): void {
    this.brokenCovers.update((broken) => new Set(broken).add(folderId));
  }

  retry(): void {
    this.failed.set(false);
    this.loadNextPage();
  }

  private loadWhenSentinelNear(): void {
    const { top } = this.sentinel().nativeElement.getBoundingClientRect();

    if (top <= window.innerHeight + FolderGridComponent.prefetchMargin) this.loadNextPage();
  }

  private loadNextPage(): void {
    if (this.loading() || this.failed() || this.completed()) return;

    this.loading.set(true);

    this.folderService.getFolders(this.nextPage, FolderGridComponent.pageSize).subscribe({
      next: (result) => {
        this.folders.update((folders) => [...folders, ...result.items]);
        this.loading.set(false);

        if (result.page >= result.totalPages) {
          this.completed.set(true);
          return;
        }

        this.nextPage = result.page + 1;
        afterNextRender(() => this.loadWhenSentinelNear(), { injector: this.injector });
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }
}
