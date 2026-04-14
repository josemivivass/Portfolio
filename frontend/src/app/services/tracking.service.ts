import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly apiUrl = 'http://localhost:3000/api/tracking/entry';
  private readonly uuidKey = 'visitor_uuid';
  private readonly sessionKey = 'visitor_session_logged';
  private entryLogged = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  logEntry(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.entryLogged) return;
    if (sessionStorage.getItem(this.sessionKey) === '1') {
      this.entryLogged = true;
      return;
    }
    this.entryLogged = true;

    const payload = {
      visitor_uuid: this.getOrCreateUuid(),
      user_agent: navigator.userAgent,
      is_logged_in: !!localStorage.getItem('token')
    };

    this.http.post(this.apiUrl, payload).subscribe({
      next: () => sessionStorage.setItem(this.sessionKey, '1'),
      error: (err) => {
        this.entryLogged = false;
        console.error('[tracking] failed to log entry', err);
      }
    });
  }

  private getOrCreateUuid(): string {
    let uuid = localStorage.getItem(this.uuidKey);
    if (!uuid) {
      uuid = this.generateUuid();
      localStorage.setItem(this.uuidKey, uuid);
    }
    return uuid;
  }

  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
