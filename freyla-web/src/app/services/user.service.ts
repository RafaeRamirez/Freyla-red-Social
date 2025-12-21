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

  updateUser(id: string, data: Partial<User>, token: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/update-user/${id}`, data, this.authHeaders(token));
  }

  setSession(token?: string, identity?: unknown): void {
    if (token) {
      localStorage.setItem('token', token);
    }
    if (identity) {
      localStorage.setItem('identity', JSON.stringify(identity));
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getIdentity<T = User>(): T | null {
    const stored = localStorage.getItem('identity');
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored) as T;
    } catch {
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('identity');
  }

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
