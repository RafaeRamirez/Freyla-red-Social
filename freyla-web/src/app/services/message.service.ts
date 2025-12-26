import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { global } from './global';

export interface MessageEntry {
  _id?: string;
  text: string;
  viewed?: string;
  created_at?: string | number;
  emitter?: unknown;
  receiver?: unknown;
}

export interface MessageListResponse {
  total: number;
  pages: number;
  page: number;
  messages: MessageEntry[];
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private readonly apiUrl = global.url;

  constructor(private http: HttpClient) {}

  sendMessage(text: string, receiver: string, token: string): Observable<{ message: MessageEntry }> {
    const body = { text, receiver };
    return this.http.post<{ message: MessageEntry }>(`${this.apiUrl}/message`, body, this.authHeaders(token));
  }

  getReceivedMessages(page: number, token: string): Observable<MessageListResponse> {
    return this.http.get<MessageListResponse>(`${this.apiUrl}/my-messages/${page}`, this.authHeaders(token));
  }

  getSentMessages(page: number, token: string): Observable<MessageListResponse> {
    return this.http.get<MessageListResponse>(`${this.apiUrl}/messages/${page}`, this.authHeaders(token));
  }

  getUnviewedMessages(token: string): Observable<{ unviewed: number }> {
    return this.http.get<{ unviewed: number }>(`${this.apiUrl}/unviewed-messages`, this.authHeaders(token));
  }

  setViewedMessages(token: string): Observable<{ messages: unknown }> {
    return this.http.put<{ messages: unknown }>(`${this.apiUrl}/set-viewed-messages`, {}, this.authHeaders(token));
  }

  setViewedMessagesByEmitter(emitter: string, token: string): Observable<{ messages: unknown }> {
    return this.http.put<{ messages: unknown }>(
      `${this.apiUrl}/set-viewed-messages`,
      { emitter },
      this.authHeaders(token)
    );
  }

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
