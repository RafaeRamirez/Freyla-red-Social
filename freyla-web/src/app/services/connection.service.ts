import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { global } from './global';

export interface FriendRequest {
  _id: string;
  requester: User;
  recipient: User;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConnectionService {
  private readonly apiUrl = global.url;

  constructor(private http: HttpClient) {}

  sendRequest(userId: string, token: string): Observable<{ request: FriendRequest }> {
    return this.http.post<{ request: FriendRequest }>(
      `${this.apiUrl}/friend-request/${userId}`,
      {},
      this.authHeaders(token)
    );
  }

  getSentRequests(token: string): Observable<{ requests: FriendRequest[] }> {
    return this.http.get<{ requests: FriendRequest[] }>(`${this.apiUrl}/friend-requests/sent`, this.authHeaders(token));
  }

  getReceivedRequests(token: string): Observable<{ requests: FriendRequest[] }> {
    return this.http.get<{ requests: FriendRequest[] }>(
      `${this.apiUrl}/friend-requests/received`,
      this.authHeaders(token)
    );
  }

  acceptRequest(requestId: string, token: string): Observable<{ request: FriendRequest }> {
    return this.http.put<{ request: FriendRequest }>(
      `${this.apiUrl}/friend-request/${requestId}/accept`,
      {},
      this.authHeaders(token)
    );
  }

  rejectRequest(requestId: string, token: string): Observable<{ request: FriendRequest }> {
    return this.http.delete<{ request: FriendRequest }>(
      `${this.apiUrl}/friend-request/${requestId}/reject`,
      this.authHeaders(token)
    );
  }

  cancelRequest(requestId: string, token: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/friend-request/${requestId}/cancel`,
      this.authHeaders(token)
    );
  }

  getFriends(token: string): Observable<{ friends: User[] }> {
    return this.http.get<{ friends: User[] }>(`${this.apiUrl}/friends`, this.authHeaders(token));
  }

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
