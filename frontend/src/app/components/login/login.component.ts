import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';
  showPassword = false;
  isLoading = false;
  isLoggedIn = false;
  userEmail = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService
  ) {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    if (isPlatformBrowser(this.platformId)) {
      this.isLoggedIn = this.authService.isAuthenticated();
      this.userEmail = this.authService.getEmail() ?? '';
      if (this.route.snapshot.queryParamMap.get('expired') === '1') {
        this.errorMessage = 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
      }
    }
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }

  logout(): void {
    const reload = () => window.location.reload();
    this.authService.logout().subscribe({ next: reload, error: reload });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.login(this.loginForm.value).subscribe({
      next: () => { sessionStorage.setItem('authReturn', '1'); window.location.href = '/'; },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.i18n.t('login.error');
        console.error(err);
      }
    });
  }
}
