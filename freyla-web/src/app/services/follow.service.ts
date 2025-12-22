import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Follow } from '../models/follow';
import { User } from '../models/user';
import { global } from './global';

@Injectable({
  providedIn: 'root',
})
export class FollowService {
  private readonly apiUrl = global.url;

  constructor(private http: HttpClient) {}

  addFollow(userId: string, token: string): Observable<{ follow: Follow }> {
    return this.http.post<{ follow: Follow }>(`${this.apiUrl}/follow/${userId}`, {}, this.authHeaders(token));
  }

  deleteFollow(userId: string, token: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/follow/${userId}`, this.authHeaders(token));
  }

  getFollowing(userId: string | null, page: number, token: string): Observable<{
    total: number;
    pages: number;
    currentPage: number;
    follows: Array<{ followed: User }>;
  }> {
    const id = userId ?? '';
    return this.http.get<{
      total: number;
      pages: number;
      currentPage: number;
      follows: Array<{ followed: User }>;
    }>(`${this.apiUrl}/following/${id}/${page}`, this.authHeaders(token));
  }

  getFollowed(userId: string | null, page: number, token: string): Observable<{
    total: number;
    pages: number;
    currentPage: number;
    followers: Array<{ user: User }>;
  }> {
    const id = userId ?? '';
    return this.http.get<{
      total: number;
      pages: number;
      currentPage: number;
      followers: Array<{ user: User }>;
    }>(`${this.apiUrl}/followed/${id}/${page}`, this.authHeaders(token));
  }

  getMyFollows(token: string): Observable<{ follows: Array<{ followed: User }> }> {
    return this.http.get<{ follows: Array<{ followed: User }> }>(`${this.apiUrl}/my-follows`, this.authHeaders(token));
  }

  getFollowers(token: string): Observable<{ follows: Array<{ user: User }> }> {
    return this.http.get<{ follows: Array<{ user: User }> }>(`${this.apiUrl}/followers`, this.authHeaders(token));
  }

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
