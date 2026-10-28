
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'DEVELOPER' | 'USER' |'ADMIN';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    roles?: string[];
  };
}

export interface CurrentUser {
  id: string;
  username: string;
  email?: string;
  roles?: string[];
}

const TOKEN_KEY = 'mp_access_token';
const REFRESH_TOKEN_KEY = 'mp_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly baseUrl = '/api/v1/users';

  readonly currentUser = signal<CurrentUser | null>(null);

  // Login
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, credentials)
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.accessToken);

          if (res.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
          }

          if (res.user) {
            this.currentUser.set(res.user);
          }
        })
      );
  }

  // Register
  register(payload: RegisterRequest): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.baseUrl}/register`,
      payload
    );
  }

  // Logout
  logout(): void {
    this.http
      .post(`${this.baseUrl}/logout`, {})
      .subscribe({ error: () => {} });

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUser.set(null);

    void this.router.navigate(['/login']);
  }

  // Get access token
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Check authentication
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Load current user
  loadCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/me`).pipe(
      tap((user) => this.currentUser.set(user))
    );
  }
}