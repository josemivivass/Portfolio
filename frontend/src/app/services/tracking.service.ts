import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private apiUrl = 'http://localhost:3000/api/tracking';
  private visitorId: string = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  initTracking(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.visitorId = this.getOrCreateVisitorId();
      this.logEntry();
    }
  }

  private getOrCreateVisitorId(): string {
    let id = localStorage.getItem('visitor_uuid');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('visitor_uuid', id);
    }
    return id;
  }

  private logEntry(): void {
    const payload = {
      visitor_uuid: this.visitorId,
      user_agent: navigator.userAgent,
      is_logged_in: !!localStorage.getItem('token')
    };
    
    fetch(`${this.apiUrl}/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error('Error tracking entry', err));
  }
}