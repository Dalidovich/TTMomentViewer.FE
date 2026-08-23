import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FolderDto } from '../models/folder';
import { MomentDto } from '../models/moment';
import { PagedResult } from '../models/paged-result';

@Injectable({ providedIn: 'root' })
export class FolderService {
  private readonly baseUrl = '/api/folders';
  private readonly http = inject(HttpClient);

  getFolders(page: number, pageSize: number): Observable<PagedResult<FolderDto>> {
    return this.http.get<PagedResult<FolderDto>>(this.baseUrl, { params: { page, pageSize } });
  }

  getFolder(folderId: string): Observable<FolderDto> {
    return this.http.get<FolderDto>(`${this.baseUrl}/${folderId}`);
  }

  getMoments(folderId: string, page: number, pageSize: number): Observable<PagedResult<MomentDto>> {
    return this.http.get<PagedResult<MomentDto>>(`${this.baseUrl}/${folderId}/moments`, {
      params: { page, pageSize },
    });
  }

  getThumbnailUrl(folderId: string): string {
    return `${this.baseUrl}/${folderId}/thumbnail`;
  }
}
