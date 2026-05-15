import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Host del backend. Las URLs de imágenes que devuelve el API son relativas
// (`/api/projects/images/…`) para que la BD sea portable; en dev el frontend
// vive en :4200 y el backend en :3000, así que hay que prefijarlas con este
// host antes de mostrarlas.
export const API_HOST = environment.apiHost;

/** Convierte una URL servida por el backend en una URL absoluta utilizable
 *  desde el navegador. Pasa intacto cualquier URL externa o data:. */
export function resolveApiAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/')) return `${API_HOST}${url}`;
  return url;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getFeaturedProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/featured`);
  }
}