import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { global } from './global';
import { User } from '../models/user';

export interface NotificationEntry {
  _id?: string;
  type: 'follow' | 'reaction' | 'comment';
  actor?: User | string;
  publication?: { _id?: string; text?: string } | string | null;
  content?: string;
  created_at?: string | number;
  seen?: boolean;
}

export interface NotificationResponse {
  notifications: NotificationEntry[];
  unviewed: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly apiUrl = global.url;

  constructor(private http: HttpClient) {}

  getNotifications(token: string, limit = 10): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(`${this.apiUrl}/notifications?limit=${limit}`, this.authHeaders(token));
  }

  setNotificationsSeen(token: string): Observable<{ notifications: unknown }> {
    return this.http.put<{ notifications: unknown }>(`${this.apiUrl}/notifications/seen`, {}, this.authHeaders(token));
  }

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
