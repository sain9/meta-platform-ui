import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth';
import { Router } from '@angular/router';

// Routes that must not receive a Bearer header
const PUBLIC_ENDPOINTS = [
  '/api/v1/users/login',
  '/api/v1/users/register',
  '/api/v1/users/refresh',
];

const hasPrefix = (url: string, list: string[]) =>
  list.some((p) => url.includes(p));

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isPublic = hasPrefix(req.url, PUBLIC_ENDPOINTS);
  const token = auth.getToken();

  const validToken =
    typeof token === 'string' &&
    token.length > 10 &&
    token !== 'undefined' &&
    token !== 'null';

  const attach = !isPublic && validToken;

  const authReq = attach
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      // 401 on a protected call → try to refresh once, retry, else logout
      if (err.status === 401 && !isPublic) {
        return auth.refresh().pipe(
          switchMap((res) => {
            const newToken =
              (res as any).accessToken ??
              (res as any).token ??
              (res as any).data?.accessToken ??
              (res as any).data?.token;

            if (!newToken || typeof newToken !== 'string') {
              auth.logout();
              router.navigate(['/login']);
              return throwError(() => err);
            }

            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            });
            return next(retried);
          }),
          catchError(() => {
            auth.logout();
            router.navigate(['/login']);
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};