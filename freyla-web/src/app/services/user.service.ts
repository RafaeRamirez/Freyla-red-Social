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

  private authHeaders(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
