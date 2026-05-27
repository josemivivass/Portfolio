import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
}

export interface ChatResponse {
  reply: string;
  remaining: number;
}

export interface ChatHistory {
  messages: ChatMessage[];
  remaining: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, { message });
  }

  sendAnonymousMessage(message: string, sessionId: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/anonymous`, { message, session_id: sessionId });
  }

  getHistory(): Observable<ChatHistory> {
    return this.http.get<ChatHistory>(`${this.apiUrl}/history`);
  }

  clearChat(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/clear`, {});
  }
}
