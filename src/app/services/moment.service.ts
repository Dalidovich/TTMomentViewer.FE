import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MomentDto } from '../models/moment';

@Injectable({ providedIn: 'root' })
export class MomentService {
  private readonly baseUrl = '/api/moments';
  private readonly http = inject(HttpClient);

  getMoment(momentId: string): Observable<MomentDto> {
    return this.http.get<MomentDto>(`${this.baseUrl}/${momentId}`);
  }

  getStreamUrl(momentId: string): string {
    return `${this.baseUrl}/${momentId}/stream`;
  }

  getThumbnailUrl(momentId: string): string {
    return `${this.baseUrl}/${momentId}/thumbnail`;
  }
}
