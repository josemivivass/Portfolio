import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Host del backend. Las URLs de imágenes que devuelve el API son relativas
// (`/api/projects/images/…`) para que la BD sea portable; en dev el frontend
// vive en :4200 y el backend en :3000, así que hay que prefijarlas con este
// host antes de mostrarlas. En prod, si todo va detrás del mismo dominio,
// `API_HOST` se queda vacío y la URL relativa también vale.
export const API_HOST = 'http://127.0.0.1:3000';

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
  // Uso estricto de 127.0.0.1 para evitar problemas de resolución IPv6 en Node
  private apiUrl = `${API_HOST}/api/projects`;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getFeaturedProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/featured`);
  }
}