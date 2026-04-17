import {
  Component, OnInit, Inject, PLATFORM_ID,
  ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, NgZone, ApplicationRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, ChatMessage } from '../../services/chatbot.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef<HTMLInputElement>;

  isOpen = false;
  messages: ChatMessage[] = [];
  inputMessage = '';
  isLoading = false;
  error = '';
  private shouldScroll = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private chatbot: ChatbotService,
    public i18n: TranslationService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private appRef: ApplicationRef
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => this.loadHistory());
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
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

    this.chatbot.sendMessage(text).subscribe({
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
