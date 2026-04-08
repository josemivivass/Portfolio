import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { TranslationService } from '../../services/translation.service';

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
    private contactService: ContactService,
    public i18n: TranslationService
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
          this.successMessage = this.i18n.t('contact.success');
          this.errorMessage = '';
          this.contactForm.reset();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = this.i18n.t('contact.error');
          this.successMessage = '';
        }
      });
    }
  }
}