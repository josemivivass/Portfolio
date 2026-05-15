import { Component, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../services/translation.service';
import { environment } from '../../../environments/environment';

declare const grecaptcha: any;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements AfterViewInit, OnDestroy {
  formData = {
    name: '',
    email: '',
    message: ''
  };

  isSubmitting = false;
  isSent = false;
  successMsg = '';
  errorMsg = '';

  readonly siteKey = '6LcYQM4sAAAAAJUqt7VydC32KYfLjtISmRvMtYoT';
  @ViewChild('recaptcha') recaptchaEl?: ElementRef<HTMLDivElement>;
  private recaptchaWidgetId: number | null = null;
  private recaptchaPoll?: any;
  private langSub?: Subscription;

  constructor(
    public i18n: TranslationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // El script de reCAPTCHA se carga async desde index.html. Esperamos a que esté listo.
    this.recaptchaPoll = setInterval(() => {
      if (typeof grecaptcha !== 'undefined' && grecaptcha.render && this.recaptchaEl) {
        clearInterval(this.recaptchaPoll);
        this.renderRecaptcha();
      }
    }, 200);

    // Re-renderizamos el captcha cuando el usuario cambia el idioma del sitio
    this.langSub = this.i18n.lang$.subscribe(() => {
      if (this.recaptchaWidgetId !== null) this.renderRecaptcha();
    });
  }

  ngOnDestroy(): void {
    if (this.recaptchaPoll) clearInterval(this.recaptchaPoll);
    if (this.langSub) this.langSub.unsubscribe();
  }

  private renderRecaptcha(): void {
    if (typeof grecaptcha === 'undefined' || !grecaptcha.render || !this.recaptchaEl) return;
    // grecaptcha.render no permite re-renderizar el mismo div, así que vaciamos antes
    this.recaptchaEl.nativeElement.innerHTML = '';
    try {
      this.recaptchaWidgetId = grecaptcha.render(this.recaptchaEl.nativeElement, {
        sitekey: this.siteKey,
        size: 'normal',
        hl: this.i18n.lang
      });
    } catch (err) {
      console.warn('Error al renderizar reCAPTCHA', err);
    }
  }

  private getRecaptchaToken(): string {
    if (typeof grecaptcha === 'undefined') return '';
    if (this.recaptchaWidgetId !== null) {
      return grecaptcha.getResponse(this.recaptchaWidgetId) || '';
    }
    return grecaptcha.getResponse() || '';
  }

  private resetRecaptcha(): void {
    if (typeof grecaptcha === 'undefined') return;
    if (this.recaptchaWidgetId !== null) {
      grecaptcha.reset(this.recaptchaWidgetId);
    } else {
      grecaptcha.reset();
    }
  }

  async sendMessage(event: Event) {
    event.preventDefault();

    this.isSent = false;
    this.successMsg = '';
    this.errorMsg = '';

    const name = this.formData.name.trim();
    const email = this.formData.email.trim();
    const message = this.formData.message.trim();

    if (!name || !email || !message) {
      this.errorMsg = this.i18n.t('contact.empty') || 'Todos los campos son obligatorios.';
      this.cdr.detectChanges();
      return;
    }

    if (name.length > 100) {
      this.errorMsg = this.i18n.t('contact.name.max') || 'El nombre no puede exceder los 100 caracteres.';
      this.cdr.detectChanges();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.errorMsg = this.i18n.t('contact.email.invalid');
      this.cdr.detectChanges();
      return;
    }

    if (message.length < 20) {
      this.errorMsg = this.i18n.t('contact.message.min');
      this.cdr.detectChanges();
      return;
    }

    const recaptchaToken = this.getRecaptchaToken();
    if (!recaptchaToken) {
      this.errorMsg = this.i18n.t('contact.captcha.required');
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    // Forzamos actualización visual para que muestre "Enviando..."
    this.cdr.detectChanges();

    try {
      const response = await fetch(`${environment.apiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...this.formData, recaptchaToken })
      });

      if (response.status === 429) {
        this.errorMsg = this.i18n.t('contact.rate_limit');
        this.resetRecaptcha();
        this.isSubmitting = false;
        this.cdr.detectChanges();
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 400 && data?.message?.toLowerCase().includes('captcha')) {
          this.errorMsg = this.i18n.t('contact.captcha.failed');
        } else {
          throw new Error('Error en el servidor');
        }
        this.resetRecaptcha();
        this.isSubmitting = false;
        this.cdr.detectChanges();
        return;
      }

      this.successMsg = this.i18n.t('contact.success');
      this.isSent = true;
      this.isSubmitting = false;
      this.formData = { name: '', email: '', message: '' }; // Limpiamos formulario
      this.resetRecaptcha();

      // Forzamos actualización visual para que el botón se ponga verde inmediatamente
      this.cdr.detectChanges();

      // Restauramos el botón a su estado original pasados 4 segundos por si quiere enviar otro
      setTimeout(() => {
        this.isSent = false;
        this.successMsg = '';
        this.cdr.detectChanges();
      }, 4000);

    } catch (error) {
      console.error('Error de red al enviar el mensaje (¿Backend apagado, puerto incorrecto o CORS?):', error);
      this.errorMsg = this.i18n.t('contact.error');
      this.resetRecaptcha();
      this.cdr.detectChanges();
    } finally {
      if (!this.isSent) {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    }
  }
}
