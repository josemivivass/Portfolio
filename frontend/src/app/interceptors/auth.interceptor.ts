import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // Solo las peticiones a nuestra API llevan la cookie de sesión.
  if (!req.url.startsWith(environment.apiHost)) {
    return next(req);
  }

  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthCall = req.url.includes('/api/login')
        || req.url.includes('/api/register')
        || req.url.includes('/api/logout');
      if (err.status === 401 && !isAuthCall) {
        if (isPlatformBrowser(platformId)) {
          auth.logout().subscribe({ next: () => {}, error: () => {} });
        }
      }
      return throwError(() => err);
    })
  );
};
