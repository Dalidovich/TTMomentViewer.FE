# TTMomentViewer.FE

Angular 21 single-page app for browsing a local video library as a TikTok-style vertical feed. It talks to [TTMomentViewer.BE](../TTMomentViewer.BE) over HTTP.

Mobile-first, dark theme only, three tabs: feed, folders, settings.

## Requirements

- Node.js with npm 11+
- TTMomentViewer.BE running on `http://localhost:5278`

## Quick start

```bash
npm install
npm start
```

The dev server listens on `http://localhost:4200` and is bound to `0.0.0.0`, so a phone on the same network can open it. Requests to `/api/*` are proxied to the backend through `proxy.conf.json`.

```bash
npm run build     # production build into dist/
npm run watch     # development build, rebuilt on change
```

## Screens

| Route | Description |
| --- | --- |
| `/feed` | Endless shuffled feed across the whole library |
| `/folders` | Infinite-scroll grid of folders with cover thumbnails |
| `/folders/:folderId` | Infinite-scroll grid of moments in one folder |
| `/folders/:folderId/view/:momentId` | Sequential feed inside a folder, opening on the tapped moment |
| `/settings` | Stub page |

`/` and any unknown route redirect to `/feed`.

## How it behaves

**Feed.** Cards snap vertically, one per screen. Only the active card and its immediate neighbours hold a video source, so memory and traffic stay bounded while every loaded card keeps its place in the DOM. New pages load three cards before either end is reached; when a page is prepended the scroll position is re-anchored so the visible card does not jump.

The global feed asks the backend for a random seed and keeps its moments and active index alive across tab switches — scrolling back up replays the same moments. When the pages for a seed run out, the seed is bumped and paging restarts, which is what makes the feed endless. Reloading the page picks a new seed.

The folder feed is strictly sequential: it jumps straight to the page holding the tapped moment, then extends in both directions. No shuffle, no wraparound.

**Playback.** Videos loop, start muted, and play only on the active card. Sound is a global setting: the first tap on a muted feed turns sound on, every later tap toggles pause, and the speaker button in the corner works at any time. A scrubber above the title lets you seek by dragging; playback resumes on release if it was playing.

**Gestures.** Dragging horizontally moves between the three tabs, following the finger and committing past ~28% of the screen width or on a fast flick. Vertical gestures always go to the feed, and dragging at the first or last tab is damped instead of committing.

## Project layout

```
src/app/
├── app.routes.ts     # Lazy standalone routes
├── app.ts            # Shell: router outlet, tab bar, tab swipes
├── models/           # FolderDto, MomentDto, PagedResult<T>
├── services/         # folder, moment, feed, playback, tab-navigation
└── components/       # tab-bar, moment-feed, moment-card, feed-viewer,
                      # folder-viewer, folder-grid, moment-grid, settings
```

`moment-feed` is the shared scroll-snap feed; `feed-viewer` and `folder-viewer` are thin wrappers that decide which pages to feed it.

## Conventions

- Standalone components only, no NgModules
- State lives in signals (`signal`, `computed`, `effect`, `input()`, `output()`) — no NgRx, no `BehaviorSubject`
- Dependencies come from `inject()`
- Shared layout classes and all theme variables live in `src/styles.scss`; component stylesheets only add what is specific to them
- Inline SVG icons, raw touch events, and the Web Animations API — no icon, gesture, or animation packages
- Formatting via Prettier (`.prettierrc`: 100 columns, single quotes)
- No tests: the project is generated with `skipTests` and has no `test` script
