import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private loggedIn = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Inicializamos el valor revisando el token de forma segura
    this.loggedIn.next(this.hasToken());
  }

  private hasToken(): boolean {
    // Comprobamos si estamos en el navegador antes de usar localStorage
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('token');
    }
    return false;
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

  login(credentials: any): Observable<any> {
    const payload = {
      ...credentials,
      deviceInfo: this.getDeviceInfo()
    };
    return this.http.post(`${this.apiUrl}/login`, payload).pipe(
      tap((res: any) => {
        if (res && res.token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', res.token);
          this.loggedIn.next(true);
        }
      })
    );
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.loggedIn.next(false);
  }

  private getDeviceInfo() {
    if (isPlatformBrowser(this.platformId)) {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localTime: new Date().toISOString()
      };
    }
    return {};
  }
}