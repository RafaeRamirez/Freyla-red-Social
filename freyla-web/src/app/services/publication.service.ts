import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Publication, PublicationComment, PublicationReaction } from '../models/publication';
import { global } from './global';

@Injectable({
  providedIn: 'root',
})
export class PublicationService {
  private readonly apiUrl = global.url;

  constructor(private http: HttpClient) {}

  addPublication(text: string, token: string, hasFile = false): Observable<{ publication: Publication }> {
    const body = { text, hasFile };
    return this.http.post<{ publication: Publication }>(`${this.apiUrl}/publication`, body, this.authHeaders(token));
  }

  updatePublication(
    id: string,
    text: string | null,
    token: string,
    removeFile = false
  ): Observable<{ publication: Publication }> {
    const body: { text?: string; removeFile?: boolean } = {};
    if (typeof text === 'string') {
      body.text = text;
    }
    if (removeFile) {
      body.removeFile = true;
    }
    return this.http.put<{ publication: Publication }>(`${this.apiUrl}/publication/${id}`, body, this.authHeaders(token));
  }

  deletePublication(id: string, token: string): Observable<{ publication?: Publication }> {
    return this.http.delete<{ publication?: Publication }>(`${this.apiUrl}/publication/${id}`, this.authHeaders(token));
  }

  addReaction(
    id: string,
    type: 'emoji' | 'sticker',
    value: string,
    token: string
  ): Observable<{ reactions: PublicationReaction[] }> {
    const body = { type, value };
    return this.http.post<{ reactions: PublicationReaction[] }>(
      `${this.apiUrl}/publication/${id}/reaction`,
      body,
      this.authHeaders(token)
    );
  }

  removeReaction(id: string, token: string): Observable<{ reactions: PublicationReaction[] }> {
    return this.http.delete<{ reactions: PublicationReaction[] }>(
      `${this.apiUrl}/publication/${id}/reaction`,
      this.authHeaders(token)
    );
  }

  addComment(id: string, text: string, token: string): Observable<{ comments: PublicationComment[] }> {
    const body = { text };
    return this.http.post<{ comments: PublicationComment[] }>(
      `${this.apiUrl}/publication/${id}/comment`,
      body,
      this.authHeaders(token)
    );
  }

  sharePublication(id: string, text: string, token: string): Observable<{ publication: Publication }> {
    const body = { text };
    return this.http.post<{ publication: Publication }>(
      `${this.apiUrl}/publication/${id}/share`,
      body,
      this.authHeaders(token)
    );
  }

  deleteComment(id: string, commentId: string, token: string): Observable<{ comments: PublicationComment[] }> {
    return this.http.delete<{ comments: PublicationComment[] }>(
      `${this.apiUrl}/publication/${id}/comment/${commentId}`,
      this.authHeaders(token)
    );
  }

  uploadPublicationMedia(id: string, file: File, token: string): Observable<{ publication: Publication }> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    return this.http.post<{ publication: Publication }>(
      `${this.apiUrl}/upload-image-pub/${id}`,
      formData,
      this.authHeaders(token)
    );
  }

  getPublications(
    page: number,
    token: string
  ): Observable<{
    total_items: number;
    pages: number;
    page: number;
    publications: Publication[];
  }> {
    return this.http.get<{
      total_items: number;
      pages: number;
      page: number;
      publications: Publication[];
    }>(`${this.apiUrl}/publications-personalized/${page}`, this.authHeaders(token));
  }

  getUserPublications(
    userId: string,
    page: number,
    token: string
  ): Observable<{
    total_items: number;
    pages: number;
    page: number;
    publications: Publication[];
  }> {
    return this.http.get<{
      total_items: number;
      pages: number;
      page: number;
      publications: Publication[];
    }>(`${this.apiUrl}/publications-user/${userId}/${page}`, this.authHeaders(token));
  }

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
