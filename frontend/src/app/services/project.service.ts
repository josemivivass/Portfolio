import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  // Uso estricto de 127.0.0.1 para evitar problemas de resolución IPv6 en Node
  private apiUrl = 'http://127.0.0.1:3000/api/projects';

  constructor(private http: HttpClient) {}

  getProjects(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}