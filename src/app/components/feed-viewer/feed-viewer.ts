import { Component, OnInit, inject } from '@angular/core';
import { FeedService } from '../../services/feed.service';
import { MomentFeedComponent } from '../moment-feed/moment-feed';

@Component({
  selector: 'app-feed-viewer',
  standalone: true,
  imports: [MomentFeedComponent],
  templateUrl: './feed-viewer.html',
  styleUrls: ['./feed-viewer.scss'],
})
export class FeedViewerComponent implements OnInit {
  private readonly feedService = inject(FeedService);

  readonly moments = this.feedService.moments;
  readonly loading = this.feedService.loading;
  readonly failed = this.feedService.failed;
  readonly empty = this.feedService.empty;
  readonly startIndex = this.feedService.activeIndex();

  ngOnInit(): void {
    if (this.moments().length === 0) this.feedService.loadNextPage();
  }

  onActiveIndexChange(index: number): void {
    this.feedService.activeIndex.set(index);
  }

  onReachEnd(): void {
    if (this.failed()) return;

    this.feedService.loadNextPage();
  }

  onRetry(): void {
    this.feedService.failed.set(false);
    this.feedService.loadNextPage();
  }
}
