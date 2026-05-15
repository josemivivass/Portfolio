import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TranslationService } from './translation.service';
import { environment } from '../../environments/environment';

export interface ProfilePayload {
  es: Record<string, string>;
  en: Record<string, string>;
  photo_updated_at: number;
  editable_keys?: string[];
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/profile`;
  private photoVersionSubject = new BehaviorSubject<number>(0);
  photoVersion$ = this.photoVersionSubject.asObservable();
  private loaded = false;

  constructor(private http: HttpClient, private i18n: TranslationService) {}

  get photoUrl(): string {
    return `${this.apiUrl}/photo?v=${this.photoVersionSubject.value}`;
  }

  load(): Observable<ProfilePayload | null> {
    if (this.loaded) return of(null);
    return this.http.get<ProfilePayload>(`${this.apiUrl}/texts`).pipe(
      tap((data) => {
        this.loaded = true;
        this.i18n.applyOverrides(data?.es ?? {}, data?.en ?? {});
        this.photoVersionSubject.next(data?.photo_updated_at ?? 0);
      }),
      catchError((err) => {
        console.error('[profile] load failed', err);
        return of(null);
      })
    );
  }
}
