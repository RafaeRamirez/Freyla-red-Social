import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { global } from './global';

type PreferenceEvent = 'reaction' | 'comment' | 'follow' | 'view' | 'search';

@Injectable({
  providedIn: 'root',
})
export class PreferenceService {
  private readonly apiUrl = global.url;

  constructor(private http: HttpClient) {}

  track(
    event: PreferenceEvent,
    token: string,
    payload: {
      publicationId?: string;
      searchText?: string;
      commentText?: string;
      authorId?: string;
    }
  ): Observable<{ ok: boolean }> {
    const body = { event, ...payload };
    return this.http.post<{ ok: boolean }>(`${this.apiUrl}/preferences/track`, body, this.authHeaders(token));
  }

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
