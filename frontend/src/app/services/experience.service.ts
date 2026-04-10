import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExperienceService {
  private apiUrl = 'http://127.0.0.1:3000/api/experience';

  constructor(private http: HttpClient) {}

  getExperience(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
