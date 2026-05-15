import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export type UserRole = 'admin' | 'editor' | 'user' | null;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private loggedIn = new BehaviorSubject<boolean>(false);
  private role = new BehaviorSubject<UserRole>(null);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loggedIn.next(this.hasToken());
    this.role.next(this.readRoleFromToken());
  }

  private hasToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('token');
    }
    return false;
  }

  private readRoleFromToken(): UserRole {
    if (!isPlatformBrowser(this.platformId)) return null;
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload?.role as UserRole) ?? null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

  role$(): Observable<UserRole> {
    return this.role.asObservable();
  }

  getRole(): UserRole {
    return this.role.value;
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('token');
  }

  isAdmin(): boolean { return this.role.value === 'admin'; }
  isEditor(): boolean { return this.role.value === 'editor'; }
  canAccessAdminPanel(): boolean {
    return this.role.value === 'admin' || this.role.value === 'editor';
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
          this.role.next(this.readRoleFromToken());
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
    this.role.next(null);
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
