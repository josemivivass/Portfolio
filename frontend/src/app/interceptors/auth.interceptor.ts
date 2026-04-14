import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/api/login') && !req.url.includes('/api/register')) {
        if (isPlatformBrowser(platformId)) {
          auth.logout();
          sessionStorage.setItem('authReturn', '1');
          router.navigate(['/login'], { queryParams: { expired: '1' } });
        }
      }
      return throwError(() => err);
    })
  );
};
