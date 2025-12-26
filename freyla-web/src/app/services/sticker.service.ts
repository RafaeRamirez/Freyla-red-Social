import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sticker } from '../models/sticker';
import { global } from './global';

@Injectable({
  providedIn: 'root',
})
export class StickerService {
  private readonly apiUrl = global.url;

  constructor(private http: HttpClient) {}

  getStickers(
    token: string,
    page = 1,
    limit = 40,
    scope: 'all' | 'system' | 'user' | 'mine' = 'all'
  ): Observable<{ stickers: Sticker[]; total_items: number; pages: number; page: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      scope,
    });
    return this.http.get<{ stickers: Sticker[]; total_items: number; pages: number; page: number }>(
      `${this.apiUrl}/stickers?${params.toString()}`,
      this.authHeaders(token)
    );
  }

  uploadSticker(token: string, file: File, name?: string): Observable<{ sticker: Sticker }> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    if (name) {
      formData.append('name', name);
    }
    return this.http.post<{ sticker: Sticker }>(`${this.apiUrl}/stickers`, formData, this.authHeaders(token));
  }

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
