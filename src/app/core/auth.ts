import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

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
  role: 'DEVELOPER' | 'USER' | 'ADMIN';
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: { id: string; username: string; email?: string; roles?: string[] };
  // Common backend wrappers — add these so typed accesses don't break
  data?: LoginResponse;
  result?: LoginResponse;
  payload?: LoginResponse;
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

  private readonly baseUrl = `${environment.apiBase}/users`;

  readonly currentUser = signal<CurrentUser | null>(null);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, credentials)
      .pipe(
        tap((res) => {
          const access = this.extractAccessToken(res);
          if (!access) {
            console.error(
              '[auth] login response — no access token found. Response shape:',
              res
            );
            throw new Error(
              'Login succeeded but the response did not contain an access token. ' +
                'Check the browser console for the actual response shape.'
            );
          }
          localStorage.setItem(TOKEN_KEY, access);

          const refresh = this.extractRefreshToken(res);
          if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);

          const user = this.extractUser(res);
          if (user) this.currentUser.set(user);
        })
      );
  }

  register(payload: RegisterRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/register`, payload);
  }

  logout(): void {
    this.http
      .post(`${this.baseUrl}/logout`, {})
      .subscribe({ error: () => {} });

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUser.set(null);

    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const t = this.getToken();
    return typeof t === 'string' && t.length > 10 && t !== 'undefined' && t !== 'null';
  }

  loadCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/me`).pipe(
      tap((user) => this.currentUser.set(user))
    );
  }

  refresh(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          const access = this.extractAccessToken(res);
          if (!access) {
            console.error('[auth] refresh response — no access token found:', res);
            throw new Error('Refresh response did not contain an access token');
          }
          localStorage.setItem(TOKEN_KEY, access);

          const nextRefresh = this.extractRefreshToken(res);
          if (nextRefresh) localStorage.setItem(REFRESH_TOKEN_KEY, nextRefresh);

          const user = this.extractUser(res);
          if (user) this.currentUser.set(user);
        })
      );
  }

  // ---------- token extraction ----------

  private extractAccessToken(res: LoginResponse | null | undefined): string | null {
    if (!res) return null;

    // Try current object first
    const direct =
      res.accessToken ??
      res.token ??
      res.access_token;
    if (typeof direct === 'string' && direct.length > 0) return direct;

    // Try common wrappers
    const wrapped =
      res.data?.accessToken ??
      res.data?.token ??
      res.data?.access_token ??
      res.result?.accessToken ??
      res.result?.token ??
      res.result?.access_token ??
      res.payload?.accessToken ??
      res.payload?.token ??
      res.payload?.access_token;
    if (typeof wrapped === 'string' && wrapped.length > 0) return wrapped;

    return null;
  }

  private extractRefreshToken(res: LoginResponse | null | undefined): string | null {
    if (!res) return null;

    const direct = res.refreshToken ?? res.refresh_token;
    if (typeof direct === 'string' && direct.length > 0) return direct;

    const wrapped =
      res.data?.refreshToken ??
      res.data?.refresh_token ??
      res.result?.refreshToken ??
      res.result?.refresh_token ??
      res.payload?.refreshToken ??
      res.payload?.refresh_token;
    if (typeof wrapped === 'string' && wrapped.length > 0) return wrapped;

    return null;
  }

  private extractUser(res: LoginResponse | null | undefined): CurrentUser | null {
    if (!res) return null;
    return res.user ?? res.data?.user ?? res.result?.user ?? res.payload?.user ?? null;
  }
}