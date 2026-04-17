import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://localhost:3000/api/chatbot';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  sendMessage(message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, { message }, { headers: this.getHeaders() });
  }

  getHistory(): Observable<ChatHistory> {
    return this.http.get<ChatHistory>(`${this.apiUrl}/history`, { headers: this.getHeaders() });
  }

  clearChat(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/clear`, {}, { headers: this.getHeaders() });
  }
}
