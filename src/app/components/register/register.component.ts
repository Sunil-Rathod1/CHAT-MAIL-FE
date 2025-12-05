import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>ChatMail</h1>
          <p>Create your account</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input 
              id="name"
              type="text" 
              formControlName="name"
              placeholder="Enter your name"
              [class.error]="registerForm.get('name')?.invalid && registerForm.get('name')?.touched"
            />
            @if (registerForm.get('name')?.hasError('required') && registerForm.get('name')?.touched) {
              <span class="error-text">Name is required</span>
            }
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input 
              id="email"
              type="email" 
              formControlName="email"
              placeholder="Enter your email"
              [class.error]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
            />
            @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
              <span class="error-text">Email is required</span>
            }
            @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
              <span class="error-text">Invalid email format</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              id="password"
              type="password" 
              formControlName="password"
              placeholder="Enter your password (min 6 characters)"
              [class.error]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
            />
            @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
              <span class="error-text">Password is required</span>
            }
            @if (registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched) {
              <span class="error-text">Password must be at least 6 characters</span>
            }
          </div>

          @if (errorMessage()) {
            <div class="alert alert-error">{{ errorMessage() }}</div>
          }

          <button 
            type="submit" 
            class="btn btn-primary btn-block"
            [disabled]="isLoading() || registerForm.invalid"
          >
            @if (isLoading()) {
              <span>Creating account...</span>
            } @else {
              <span>Sign Up</span>
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Sign in</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .auth-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .auth-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
      margin: 0 0 0.5rem 0;
    }

    .auth-header p {
      color: #666;
      margin: 0;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 500;
      color: #333;
      font-size: 0.9rem;
    }

    .form-group input {
      padding: 0.75rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group input.error {
      border-color: #f44336;
    }

    .error-text {
      color: #f44336;
      font-size: 0.85rem;
    }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .alert-error {
      background-color: #ffebee;
      color: #c62828;
      border: 1px solid #ef9a9a;
    }

    .btn {
      padding: 0.875rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-block {
      width: 100%;
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      color: #666;
    }

    .auth-footer a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .auth-footer a:hover {
      text-decoration: underline;
    }

    /* Tablet */
    @media (max-width: 768px) {
      .auth-card {
        padding: 1.75rem;
        max-width: 380px;
      }

      .auth-header h1 {
        font-size: 1.75rem;
      }

      .auth-header p {
        font-size: 0.95rem;
      }

      .form-group input {
        padding: 0.7rem 0.9rem;
      }

      .btn {
        padding: 0.8rem 1.25rem;
      }
    }

    /* Mobile */
    @media (max-width: 480px) {
      .auth-container {
        padding: 0.75rem;
      }

      .auth-card {
        padding: 1.5rem;
        border-radius: 10px;
      }

      .auth-header {
        margin-bottom: 1.5rem;
      }

      .auth-header h1 {
        font-size: 1.6rem;
      }

      .auth-header p {
        font-size: 0.9rem;
      }

      .auth-form {
        gap: 1.25rem;
      }

      .form-group label {
        font-size: 0.85rem;
      }

      .form-group input {
        padding: 0.65rem 0.85rem;
        font-size: 0.95rem;
      }

      .btn {
        padding: 0.75rem 1rem;
        font-size: 0.95rem;
      }

      .auth-footer {
        margin-top: 1.25rem;
        font-size: 0.9rem;
      }
    }

    /* Small Mobile */
    @media (max-width: 360px) {
      .auth-card {
        padding: 1.25rem;
      }

      .auth-header h1 {
        font-size: 1.5rem;
      }

      .form-group input {
        padding: 0.6rem 0.75rem;
        font-size: 0.9rem;
      }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal('');

  registerForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      this.authService.register(this.registerForm.value as any).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.router.navigate(['/chat']);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.error?.message || 'Registration failed. Please try again.');
        }
      });
    }
  }
}
