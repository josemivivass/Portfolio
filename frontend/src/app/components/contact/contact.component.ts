import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  formData = {
    name: '',
    email: '',
    message: ''
  };
  
  isSubmitting = false;
  isSent = false;
  successMsg = '';
  errorMsg = '';

  constructor(
    public i18n: TranslationService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

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

    this.isSubmitting = true;
    // Forzamos actualización visual para que muestre "Enviando..."
    this.cdr.detectChanges();

    try {
      // Cambia la URL si tu backend se despliega en otro puerto o dominio
      const response = await fetch('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formData)
      });

      if (!response.ok) throw new Error('Error en el servidor');

      this.successMsg = this.i18n.t('contact.success');
      this.isSent = true;
      this.isSubmitting = false;
      this.formData = { name: '', email: '', message: '' }; // Limpiamos formulario
      
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
      this.cdr.detectChanges();
    } finally {
      if (!this.isSent) {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    }
  }
}