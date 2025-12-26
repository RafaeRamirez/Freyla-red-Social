import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { global } from './global';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = global.url;

  constructor(private http: HttpClient) {}

  register(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, user);
  }

  login(email: string, password: string, getToken = false): Observable<any> {
    const body = { email, password, gettoken: getToken };
    return this.http.post(`${this.apiUrl}/login`, body);
  }

  getUser(id: string, token: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/user/${id}`, this.authHeaders(token));
  }

  getUserProfile(
    id: string,
    token: string
  ): Observable<{ user: User; following: unknown; followed: unknown }> {
    return this.http.get<{ user: User; following: unknown; followed: unknown }>(
      `${this.apiUrl}/user/${id}`,
      this.authHeaders(token)
    );
  }

  updateUser(
    id: string,
    data: Partial<User> & { currentPassword?: string },
    token: string
  ): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${this.apiUrl}/update-user/${id}`, data, this.authHeaders(token));
  }

  updateUserImage(id: string, file: File, token: string): Observable<{ user: User }> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    return this.http.post<{ user: User }>(
      `${this.apiUrl}/update-image-user/${id}`,
      formData,
      this.authHeaders(token)
    );
  }

  updateUserCover(id: string, file: File, token: string): Observable<{ user: User }> {
    const formData = new FormData();
    formData.append('cover', file, file.name);
    return this.http.post<{ user: User }>(
      `${this.apiUrl}/update-cover-user/${id}`,
      formData,
      this.authHeaders(token)
    );
  }

  getUsers(
    page: number,
    token: string
  ): Observable<{
    users: User[];
    total: number;
    pages: number;
    page: number;
    users_following: string[];
    users_follow_me: string[];
  }> {
    return this.http.get<{
      users: User[];
      total: number;
      pages: number;
      page: number;
      users_following: string[];
      users_follow_me: string[];
    }>(`${this.apiUrl}/users/${page}`, this.authHeaders(token));
  }

  getCounters(userId?: string): Observable<{ following: number; followed: number; publications: number }> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
    const path = userId ? `/counters/${userId}` : '/counters';
    return this.http.get<{ following: number; followed: number; publications: number }>(
      `${this.apiUrl}${path}`,
      { headers }
    );
  }

  setStats(stats: { following: number; followed: number; publications: number }): void {
    localStorage.setItem('stats', JSON.stringify(stats));
  }

  getStats<T = { following: number; followed: number; publications: number }>(): T | null {
    const stored = localStorage.getItem('stats');
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored) as T;
    } catch {
      return null;
    }
  }

  setSession(token?: string, identity?: unknown): void {
    if (token) {
      localStorage.setItem('token', token);
    }
    if (identity) {
      localStorage.setItem('identity', JSON.stringify(identity));
    } else if (token) {
      const decoded = this.decodeTokenPayload(token);
      if (decoded) {
        localStorage.setItem('identity', JSON.stringify(decoded));
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getIdentity<T = User>(): T | null {
    const stored = localStorage.getItem('identity');
    if (!stored) {
      const token = localStorage.getItem('token');
      return this.decodeTokenPayload<T>(token);
    }
    try {
      return JSON.parse(stored) as T;
    } catch {
      const token = localStorage.getItem('token');
      return this.decodeTokenPayload<T>(token);
    }
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('identity');
    localStorage.removeItem('stats');
  }

  ping(token: string): Observable<{ ok: boolean; timestamp: number }> {
    return this.http.get<{ ok: boolean; timestamp: number }>(
      `${this.apiUrl}/ping`,
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

  private decodeTokenPayload<T>(token?: string | null): T | null {
    if (!token) {
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }
}
