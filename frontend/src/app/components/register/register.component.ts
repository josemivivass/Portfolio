import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  isLoggedIn = false;
  userEmail = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.registerForm = this.fb.group({
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        this.isLoggedIn = true;
        this.userEmail  = this.decodeEmail(token);
      }
    }
  }

  private decodeEmail(token: string): string {
    try {
      return JSON.parse(atob(token.split('.')[1])).email ?? '';
    } catch { return ''; }
  }

  logout(): void {
    this.authService.logout();
    window.location.reload();
  }

  passwordMatchValidator(control: AbstractControl) {
    const pw  = control.get('password')?.value;
    const cpw = control.get('confirmPassword')?.value;
    return pw === cpw ? null : { mismatch: true };
  }

  togglePassword():        void { this.showPassword        = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';
    const { confirmPassword, ...userData } = this.registerForm.value;
    this.authService.register(userData).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Error en el registro. El email podría estar en uso.';
        console.error(err);
      }
    });
  }
}
