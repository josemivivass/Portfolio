import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { environment } from '../../environments/environment';

/**
 * Durante el renderizado en servidor, reescribe las llamadas a la API pública
 * para que salgan por loopback al backend local.
 *
 * En el navegador es un no-op: el cliente sigue usando el dominio público.
 */
export const ssrApiInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformServer(platformId) || !req.url.startsWith(environment.apiHost)) {
    return next(req);
  }

  const internalUrl = environment.ssrApiHost + req.url.slice(environment.apiHost.length);
  return next(req.clone({ url: internalUrl }));
};
