import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/feed',
    pathMatch: 'full',
  },
  {
    path: 'feed',
    loadComponent: () =>
      import('./components/feed-viewer/feed-viewer').then((m) => m.FeedViewerComponent),
  },
  {
    path: 'folders/:folderId/view/:momentId',
    loadComponent: () =>
      import('./components/folder-viewer/folder-viewer').then((m) => m.FolderViewerComponent),
  },
  {
    path: 'folders/:folderId',
    loadComponent: () =>
      import('./components/moment-grid/moment-grid').then((m) => m.MomentGridComponent),
  },
  {
    path: 'folders',
    loadComponent: () =>
      import('./components/folder-grid/folder-grid').then((m) => m.FolderGridComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings').then((m) => m.SettingsComponent),
  },
  {
    path: '**',
    redirectTo: '/feed',
  },
];
