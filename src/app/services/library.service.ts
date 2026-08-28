import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LibraryStatsDto } from '../models/library-stats';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly baseUrl = '/api/library';
  private readonly http = inject(HttpClient);

  getStats(): Observable<LibraryStatsDto> {
    return this.http.get<LibraryStatsDto>(`${this.baseUrl}/stats`);
  }

  getExportUrl(): string {
    return `${this.baseUrl}/export`;
  }
}
