import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

export interface CvLangMeta {
  filename: string;
  custom: boolean;
  updated_at: number;
}

export interface CvMeta {
  es: CvLangMeta;
  en: CvLangMeta;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders();
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
  updateProjectFeatured(id: number, is_featured: boolean): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/admin/projects/${id}/featured`,
      { is_featured },
      { headers: this.headers() }
    );
  }
  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/projects/${id}`, { headers: this.headers() });
  }
  uploadProjectImage(
    dataUrl: string,
    projectId: number | null
  ): Observable<{ url: string; filename: string; folder: string; size: number; mime: string }> {
    return this.http.post<{ url: string; filename: string; folder: string; size: number; mime: string }>(
      `${this.apiUrl}/admin/projects/upload-image`,
      { dataUrl, projectId },
      { headers: this.headers() }
    );
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

  // Education
  listEducation(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/education`);
  }
  createEducation(e: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/education`, e, { headers: this.headers() });
  }
  updateEducation(id: number, e: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/education/${id}`, e, { headers: this.headers() });
  }
  deleteEducation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/education/${id}`, { headers: this.headers() });
  }

  // Skills
  listSkills(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/skills`);
  }
  createSkill(s: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/skills`, s, { headers: this.headers() });
  }
  updateSkill(id: number, s: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/skills/${id}`, s, { headers: this.headers() });
  }
  deleteSkill(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/skills/${id}`, { headers: this.headers() });
  }

  // Logs / messages
  listVisitorLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/visitor-logs`, { headers: this.headers() });
  }
  deleteVisitorLog(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/visitor-logs/${id}`, { headers: this.headers() });
  }
  listLoginLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/login-logs`, { headers: this.headers() });
  }
  deleteLoginLog(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/login-logs/${id}`, { headers: this.headers() });
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
  getCvMeta(): Observable<CvMeta> {
    return this.http.get<CvMeta>(`${this.apiUrl}/profile/cv-meta`, { headers: this.headers() });
  }
  uploadCv(lang: 'es' | 'en', dataUrl: string): Observable<{ lang: string; updated_at: number; size: number }> {
    return this.http.post<{ lang: string; updated_at: number; size: number }>(
      `${this.apiUrl}/profile/cv/${lang}`,
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
  getChatbotModel(): Observable<{ model: string; default_model: string; available_models: string[] }> {
    return this.http.get<{ model: string; default_model: string; available_models: string[] }>(
      `${this.apiUrl}/profile/chatbot-model`,
      { headers: this.headers() }
    );
  }
  updateChatbotModel(model: string): Observable<{ model: string }> {
    return this.http.put<{ model: string }>(
      `${this.apiUrl}/profile/chatbot-model`,
      { model },
      { headers: this.headers() }
    );
  }
}