import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { ssrApiInterceptor } from './interceptors/ssr-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    // authInterceptor primero: decide sobre la URL pública.
    // ssrApiInterceptor después: reescribe a loopback solo en servidor.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, ssrApiInterceptor]))
  ]
};
