import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export type UserRole = 'admin' | 'editor' | 'user' | null;

// Datos NO sensibles del usuario, solo para pintar la UI. La autenticación real
// es la cookie httpOnly que valida el backend.
interface SessionInfo {
  role: Exclude<UserRole, null>;
  email: string;
}

const STORAGE_KEY = 'auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private loggedIn = new BehaviorSubject<boolean>(false);
  private role = new BehaviorSubject<UserRole>(null);
  private email: string | null = null;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    const session = this.readSession();
    if (session) {
      this.email = session.email;
      this.loggedIn.next(true);
      this.role.next(session.role);
    }
  }

  private readSession(): SessionInfo | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role && parsed.email) {
        return { role: parsed.role, email: parsed.email };
      }
    } catch {
      /* dato corrupto: se ignora */
    }
    return null;
  }

  private storeSession(session: SessionInfo): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }

  private clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.email = null;
    this.loggedIn.next(false);
    this.role.next(null);
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

  isAuthenticated(): boolean {
    return this.loggedIn.value;
  }

  role$(): Observable<UserRole> {
    return this.role.asObservable();
  }

  getRole(): UserRole {
    return this.role.value;
  }

  getEmail(): string | null {
    return this.email;
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
    // El backend responde fijando la cookie httpOnly de sesión y devuelve
    // { role, email } (datos no sensibles) para la UI.
    return this.http.post(`${this.apiUrl}/login`, payload).pipe(
      tap((res: any) => {
        if (res && res.role && res.email) {
          const session: SessionInfo = { role: res.role, email: res.email };
          this.storeSession(session);
          this.email = res.email;
          this.loggedIn.next(true);
          this.role.next(res.role);
        }
      })
    );
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  logout(): Observable<any> {
    this.clearSession();
    return this.http.post(`${this.apiUrl}/logout`, {});
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
