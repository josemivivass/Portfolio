import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface AdminUser {
  id: number;
  email: string;
  role: 'admin' | 'editor' | 'user';
  created_at: string;
}

export interface ProfileData {
  es: Record<string, string>;
  en: Record<string, string>;
  photo_updated_at: number;
  editable_keys: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = 'http://127.0.0.1:3000/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.getToken() ?? ''}`
    });
  }

  // Users
  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/admin/users`, { headers: this.headers() });
  }
  updateUserRole(id: number, role: AdminUser['role']): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/users/${id}/role`, { role }, { headers: this.headers() });
  }
  updateUser(id: number, data: { email: string; role?: AdminUser['role'] }): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/users/${id}`, data, { headers: this.headers() });
  }
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${id}`, { headers: this.headers() });
  }

  // Projects
  listProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/projects`);
  }
  createProject(p: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/projects`, p, { headers: this.headers() });
  }
  updateProject(id: number, p: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/projects/${id}`, p, { headers: this.headers() });
  }
  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/projects/${id}`, { headers: this.headers() });
  }

  // Experience
  listExperience(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/experience`);
  }
  createExperience(e: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/experience`, e, { headers: this.headers() });
  }
  updateExperience(id: number, e: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/experience/${id}`, e, { headers: this.headers() });
  }
  deleteExperience(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/experience/${id}`, { headers: this.headers() });
  }

  // Logs / messages
  listVisitorLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/visitor-logs`, { headers: this.headers() });
  }
  listLoginLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/login-logs`, { headers: this.headers() });
  }
  listContactMessages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/contact-messages`, { headers: this.headers() });
  }
  deleteContactMessage(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/contact-messages/${id}`, { headers: this.headers() });
  }
  // Chatbot
  listChatbotMessages(): Observable<{ messages: any[]; clears: any[] }> {
    return this.http.get<{ messages: any[]; clears: any[] }>(`${this.apiUrl}/admin/chatbot-messages`, { headers: this.headers() });
  }
  deleteChatbotMessage(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/chatbot-messages/${id}`, { headers: this.headers() });
  }
  deleteChatbotConversation(ids: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/chatbot-conversations/delete`, { ids }, { headers: this.headers() });
  }

  updateContactMessageAnswered(id: number, is_answered: boolean): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/admin/contact-messages/${id}/answered`,
      { is_answered },
      { headers: this.headers() }
    );
  }

  // Profile
  getProfile(): Observable<ProfileData> {
    return this.http.get<ProfileData>(`${this.apiUrl}/profile/texts`);
  }
  updateProfileTexts(data: { es: Record<string, string>; en: Record<string, string> }): Observable<ProfileData> {
    return this.http.put<ProfileData>(`${this.apiUrl}/profile/texts`, data, { headers: this.headers() });
  }
  uploadProfilePhoto(dataUrl: string): Observable<{ photo_updated_at: number }> {
    return this.http.post<{ photo_updated_at: number }>(
      `${this.apiUrl}/profile/photo`,
      { dataUrl },
      { headers: this.headers() }
    );
  }
  getChatbotPrompt(): Observable<{ prompt: string; default_prompt: string }> {
    return this.http.get<{ prompt: string; default_prompt: string }>(
      `${this.apiUrl}/profile/chatbot-prompt`,
      { headers: this.headers() }
    );
  }
  updateChatbotPrompt(prompt: string): Observable<{ prompt: string }> {
    return this.http.put<{ prompt: string }>(
      `${this.apiUrl}/profile/chatbot-prompt`,
      { prompt },
      { headers: this.headers() }
    );
  }
}
