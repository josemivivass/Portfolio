import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  contactForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService
  ) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      this.contactService.sendMessage(this.contactForm.value).subscribe({
        next: () => {
          this.successMessage = 'Mensaje enviado correctamente. Me pondré en contacto contigo pronto.';
          this.errorMessage = '';
          this.contactForm.reset();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = 'Hubo un error al enviar el mensaje. Inténtalo de nuevo más tarde.';
          this.successMessage = '';
        }
      });
    }
  }
}