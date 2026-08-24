# TTMomentViewer.FE — Frontend for TTMomentViewer

## Overview

Angular 21 standalone application: a mobile-first SPA with a TikTok-style vertical feed of short videos ("moments") served by TTMomentViewer.BE. Three tabs — feed, folder grids, settings. Dark theme only.

## Architecture

```
src/
├── main.ts                          # Bootstrap (standalone)
├── index.html                       # viewport-fit=cover, theme-color
├── styles.scss                      # CSS custom properties + shared page/grid classes
└── app/
    ├── app.config.ts                # Router (scroll restoration disabled) + HttpClient
    ├── app.routes.ts                # Lazy standalone routes
    ├── app.ts / .html / .scss       # Shell: router-outlet + tab bar + swipe between tabs
    ├── models/
    │   ├── folder.ts                # FolderDto
    │   ├── moment.ts                # MomentDto
    │   └── paged-result.ts          # PagedResult<T>
    ├── services/
    │   ├── folder.service.ts        # Folder list, single folder, folder moments, cover URL
    │   ├── moment.service.ts        # Single moment, stream URL, thumbnail URL
    │   ├── feed.service.ts          # Global feed state: seed, pages, history, active index
    │   ├── playback.service.ts      # Global soundEnabled + playbackRate signals
    │   └── tab-navigation.service.ts # Tab order, neighbouring tab path for a URL
    └── components/
        ├── tab-bar/                 # Fixed bottom nav, three tabs
        ├── moment-feed/             # Shared scroll-snap feed: observer, positioning, paging
        ├── moment-card/             # One card: video, sound, pause, scrubber, name overlay
        ├── feed-viewer/             # /feed — thin wrapper over the shuffled global feed
        ├── folder-viewer/           # /folders/:folderId/view/:momentId — sequential folder feed
        ├── folder-grid/             # /folders — infinite-scroll folder grid
        ├── moment-grid/             # /folders/:folderId — infinite-scroll moment grid
        └── settings/                # /settings — playback speed slider + the site name
```

One component = one folder with three files (`.html`, `.scss`, `.ts`). Empty `.scss` files are kept so the layout stays uniform.

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | — | Redirects to `/feed` |
| `/feed` | `FeedViewerComponent` | Global shuffled feed |
| `/folders` | `FolderGridComponent` | Grid of non-empty folders |
| `/folders/:folderId` | `MomentGridComponent` | Grid of moments in a folder |
| `/folders/:folderId/view/:momentId` | `FolderViewerComponent` | Sequential feed inside a folder, starting at the tapped moment |
| `/settings` | `SettingsComponent` | Playback speed setting and the site name |
| `**` | — | Redirects to `/feed` |

All routes are lazy (`loadComponent`). `/folders/:folderId/view/:momentId` is declared before `/folders/:folderId`. Back buttons use `Location.back()`.

## Backend API

Requests go through the Angular dev-server proxy (`proxy.conf.json`) to TTMomentViewer.BE at `http://localhost:5278`. See `TTMomentViewer.BE/CLAUDE.md` for the full API reference.

| Method | Route | Used by |
|---|---|---|
| GET | `/api/folders?page=&pageSize=` | FolderGrid (`pageSize = 30`) |
| GET | `/api/folders/{folderId}` | MomentGrid (header title) |
| GET | `/api/folders/{folderId}/moments?page=&pageSize=` | MomentGrid (`pageSize = 30`), FolderViewer (`pageSize = 10`) |
| GET | `/api/folders/{folderId}/thumbnail` | FolderGrid (as `<img src>`) |
| GET | `/api/moments/{momentId}` | FolderViewer (reads `index` to pick the start page) |
| GET | `/api/moments/{momentId}/stream` | MomentCard (as `<video src>`) |
| GET | `/api/moments/{momentId}/thumbnail` | MomentGrid (as `<img src>`) |
| GET | `/api/feed?seed=&page=&pageSize=` | FeedService (`pageSize = 10`) |

Thumbnail and stream URLs are built by the services and bound directly into the template; they are never fetched through `HttpClient`.

## Feed Mechanics

Shared by both viewers through `MomentFeedComponent`:

- Scroll container with `overflow-y: scroll` and `scroll-snap-type: y mandatory`; each card is `height: 100dvh` with `scroll-snap-align: start` and `scroll-snap-stop: always`.
- The active card is detected by an `IntersectionObserver` rooted on the scroller with `threshold: 0.6`.
- Every loaded card stays in the DOM, but only the active card and its neighbours (±1) get a `src` — that is the preload. Others have the attribute removed to save memory and traffic.
- `reachEnd` / `reachStart` fire when the active index comes within `loadThreshold = 3` of either end, so the wrapper can load the next or previous page.
- When a page is prepended, `syncPosition()` anchors on the previously first moment id and shifts `scrollTop` by the number of inserted cards, keeping the visible card in place.
- `startIndex` positions the feed on first render only (`positioned` flag).

**Global feed** (`FeedService`, `providedIn: 'root'`): generates a random 32-bit `seed`, appends `/api/feed` pages into a signal array, and keeps that array and the active index across tab switches — scrolling back up replays exactly the same moments. When the pages for a seed run out, the seed is incremented and paging restarts at page 1, so the feed is endless. A page reload resets everything and picks a new seed.

**Folder feed** (`FolderViewerComponent`): strictly sequential, no shuffle and no wraparound. It reads `MomentDto.index`, loads page `floor(index / 10) + 1`, positions on the card, then extends in both directions by tracking `firstPage` / `lastPage` / `totalPages`.

## Tab Swipes

`App` handles `touchstart` / `touchmove` / `touchend` / `touchcancel` on `.app-shell` and drives horizontal navigation across the three tabs:

- Direction locks after `lockThreshold = 12` px; a gesture with a larger vertical delta is dropped so the feed keeps scrolling. Once locked, `preventDefault()` stops the vertical scroller from following the drag.
- `.tab-view` (the wrapper around `router-outlet`) follows the finger via inline `translateX`. The tab bar sits outside it and stays put.
- Release commits when the offset passes `commitRatio = 0.28` of the width or the velocity passes `commitVelocity = 0.5` px/ms; otherwise the wrapper animates back. At the first and last tab the drag is damped by `edgeResistance = 0.25` and never commits.
- On commit the router navigates, then the wrapper is placed one screen away in the drag direction and animated to `0` (`slideDuration = 260` ms, Web Animations API), so the new page continues the same movement.
- `TabNavigationService` maps a URL to its tab (`/folders/*` counts as the folders tab) and returns the neighbouring tab path.
- Elements marked `data-no-tab-swipe` swallow the gesture — currently the card scrubber, so scrubbing never changes the tab.

## Player Behavior

`MomentCardComponent`:

- `<video>` is `loop`, `muted`, `playsinline`, `preload="auto"`; playback is driven by an effect calling `play()` on the active card rather than by the `autoplay` attribute, so preloaded neighbours stay paused.
- **Sound** — `PlaybackService.soundEnabled` is a global signal. While it is `false`, a "Tap for sound" badge is shown on the active card and the first tap only enables sound. Every later tap toggles pause. The speaker button in the top-right corner toggles sound at any time.
- **Pause** — a pause icon flashes in the center for 700 ms via a CSS animation.
- **Progress bar** — thin track above the name overlay, updated on `timeupdate`. Scrubbing uses pointer events with pointer capture; playback pauses on `pointerdown` and resumes on release if it was playing.
- **Speed** — `PlaybackService.playbackRate` is a global signal in `0.5 … 2.5` (step `0.1`, default `1`), set on the settings page and persisted in `localStorage` under `ttmomentviewer.playbackRate`. Cards write it to both `defaultPlaybackRate` and `playbackRate`, so the `load()` after a `src` swap keeps the chosen speed.
- **Active card change** — the previous card is paused and reset to `currentTime = 0`, the new one starts.
- A `error` event on a card with a real `src` shows an inline message; the rest of the feed keeps working.

## Layout and Theme

- Dark theme only. All colors, the tab bar height, the feed max width, and the safe-area insets are CSS custom properties on `:root` in `styles.scss` (groundwork for a future switcher, which is out of scope).
- Shared classes live in `styles.scss`: `.page`, `.page-header`, `.page-title`, `.page-message`, `.page-error`, `.grid`, `.grid-cell`, `.cell-thumb`, `.cell-image`, `.cell-placeholder`, `.cell-badge`, `.cell-title`, `.grid-sentinel`, `.list-status`, `.spinner`, `.ellipsis`, `.icon-button`, `.link-button`. Component stylesheets only add what is specific to that component.
- Base width 360–430 px, layout driven by `100dvh`; the shell is capped at `--feed-max-width` and centered so desktop stays usable.
- The tab bar is fixed, uses `backdrop-filter`, and respects `env(safe-area-inset-bottom)`; it stays visible on the viewer screens over the video.
- Grids are `repeat(auto-fill, minmax(150px, 1fr))` with 9:16 cells, `loading="lazy"` images, and a placeholder swap on the `error` event.

## Key Conventions

- **Standalone components only** — no NgModules
- **Signal-based state** — `signal`, `computed`, `effect`, `input()`, `output()`, `viewChild()`; no NgRx and no BehaviorSubjects
- **`inject()` over constructor parameters** in components and services
- **No comments in code** — keep source files clean
- **English only in code** — all UI strings are inline English; there is no i18n layer
- **No tests** — `skipTests: true` in `angular.json`, no `test` script in `package.json`
- **Tuning constants as `static readonly` class fields** (`pageSize`, `prefetchMargin`, `activationRatio`, `loadThreshold`, `indicatorDuration`) — private, except `FeedService.pageSize`
- **Infinite scroll** — an `IntersectionObserver` on a trailing sentinel with a 400 px `rootMargin`, plus an `afterNextRender` re-check so short pages keep filling the viewport
- **Back navigation** — `Location.back()`, never an absolute `routerLink`
- **Route params read from `route.snapshot`** — viewers and grids are re-created on navigation
- **API proxy** — `/api/*` proxied to TTMomentViewer.BE via `proxy.conf.json`
- **Prettier** — `.prettierrc` at the root (`printWidth: 100`, `singleQuote: true`, `angular` parser for `.html`)
- **Inline SVG icons** — no icon font or icon package
- **Gestures** — raw touch events plus the Web Animations API; no gesture library, no `@angular/animations`

## Build & Run

```bash
npm install
npm start          # ng serve --host 0.0.0.0 --proxy-config proxy.conf.json → http://localhost:4200
npm run build
```

Requires TTMomentViewer.BE running on port 5278.

## Package Dependencies

- `@angular/*` 21.2.x
- `rxjs` ~7.8.0
- `zone.js` ^0.16.2
- `typescript` ~5.9.2
- `prettier` ^3.8.1 (dev)

## Project References

```
TTMomentViewer.FE  ← HTTP →  TTMomentViewer.BE  (.NET 9, port 5278)
```
