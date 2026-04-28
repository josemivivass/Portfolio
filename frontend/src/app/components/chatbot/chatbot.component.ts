import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, NgZone, ApplicationRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatbotService, ChatMessage } from '../../services/chatbot.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef<HTMLInputElement>;

  isOpen = false;
  messages: ChatMessage[] = [];
  inputMessage = '';
  isLoading = false;
  error = '';
  isLoggedIn = false;
  private shouldScroll = false;
  private anonSessionId: string | null = null;
  private authSub?: Subscription;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private chatbot: ChatbotService,
    public i18n: TranslationService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private appRef: ApplicationRef
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.authSub = this.auth.isLoggedIn().subscribe((logged) => {
      const wasLoggedIn = this.isLoggedIn;
      this.isLoggedIn = logged;
      // Reset state when auth status flips so we don't mix sessions
      if (wasLoggedIn !== logged) {
        this.messages = [];
        this.error = '';
        this.anonSessionId = logged ? null : this.generateSessionId();
      } else if (!logged && !this.anonSessionId) {
        this.anonSessionId = this.generateSessionId();
      }
      if (logged) {
        setTimeout(() => this.loadHistory());
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  private generateSessionId(): string {
    const c: any = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
    // Fallback (non-crypto-safe) — only used if crypto.randomUUID is unavailable
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      const v = ch === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.isLoggedIn && this.messages.length === 0) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    if (!this.isLoggedIn) return;
    this.chatbot.getHistory().subscribe({
      next: (data) => {
        this.messages = data.messages;
        this.shouldScroll = true;
      },
      error: () => {}
    });
  }

  send(): void {
    const text = this.inputMessage.trim();
    if (!text || this.isLoading) return;

    this.error = '';
    this.messages.push({ role: 'user', message: text });
    this.inputMessage = '';
    this.isLoading = true;
    this.shouldScroll = true;

    const request$ = this.isLoggedIn
      ? this.chatbot.sendMessage(text)
      : this.chatbot.sendAnonymousMessage(text, this.anonSessionId || (this.anonSessionId = this.generateSessionId()));

    request$.subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.messages.push({ role: 'assistant', message: data.reply });
          this.isLoading = false;
          this.shouldScroll = true;
          this.cdr.detectChanges();
          this.appRef.tick();
          this.focusInput();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isLoading = false;
          if (err.status === 429) {
            this.error = this.i18n.t('chatbot.unavailable');
          } else {
            this.error = this.i18n.t('chatbot.error');
          }
          this.cdr.detectChanges();
          this.appRef.tick();
        });
      }
    });
  }

  clearChat(): void {
    this.chatbot.clearChat().subscribe({
      next: () => {
        this.messages = [];
        this.error = '';
        this.cdr.detectChanges();
        this.appRef.tick();
      },
      error: () => {
        this.error = this.i18n.t('chatbot.error');
        this.cdr.detectChanges();
      }
    });
  }

  private focusInput(): void {
    setTimeout(() => {
      this.chatInput?.nativeElement?.focus();
    });
  }

  onPanelWheel(event: WheelEvent): void {
    event.stopPropagation();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
