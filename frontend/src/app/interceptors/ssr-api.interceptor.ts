import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { environment } from '../../environments/environment';

/**
 * Durante el renderizado en servidor, reescribe las llamadas a la API pública
 * para que salgan por la red interna en vez de dar la vuelta por Cloudflare.
 *
 * La dirección interna se puede fijar con la variable de entorno SSR_API_HOST,
 * que es lo que hace el docker-compose (apunta al contenedor de la API). Si no
 * está definida, se usa la del environment, que sirve para desarrollo local.
 *
 * En el navegador es un no-op: el cliente sigue usando el dominio público.
 */
const hostInterno = (): string => {
  const proc = (globalThis as any).process;
  return proc?.env?.SSR_API_HOST || environment.ssrApiHost;
};

export const ssrApiInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformServer(platformId) || !req.url.startsWith(environment.apiHost)) {
    return next(req);
  }

  const internalUrl = hostInterno() + req.url.slice(environment.apiHost.length);
  return next(req.clone({ url: internalUrl }));
};
