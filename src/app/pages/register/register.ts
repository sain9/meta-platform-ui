import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, RegisterRequest } from '../../core/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  /** Roles allowed for self-registration — keep in sync with backend enum */
  readonly roles: { value: RegisterRequest['role']; label: string }[] = [
  { value: 'DEVELOPER', label: 'DEVELOPER — ELEVATED ACCESS' },
  { value: 'USER',      label: 'USER — STANDARD ACCESS' },
  { value: 'ADMIN',     label: 'ADMIN — FULL CONTROL' },
];

  /** Change this if self-registration should default to a specific role */
  private readonly defaultRole: RegisterRequest['role'] = 'DEVELOPER';

  readonly form = this.fb.nonNullable.group({
    firstName: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(50)]
    ],
    lastName: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(50)]
    ],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
      ]
    ],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(128)
      ]
    ],
    role: [this.defaultRole, Validators.required]
  });

  onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.submitting.set(true);

    const payload: RegisterRequest = this.form.getRawValue();

    this.authService.register(payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            'ACCOUNT CREATED SUCCESSFULLY. YOU CAN NOW LOG IN.'
          );
          this.form.reset({
            firstName: '',
            lastName: '',
            username: '',
            email: '',
            password: '',
            role: this.defaultRole
          });
        },
        error: (error) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        }
      });
  }

  /** Unwraps the various error shapes a Java/Spring backend may return */
  private extractErrorMessage(error: any): string {
    if (!error) {
      return 'REGISTRATION FAILED. VERIFY YOUR DETAILS AND TRY AGAIN.';
    }

    if (error.status === 0) {
      return 'CANNOT REACH SERVER. CHECK YOUR CONNECTION.';
    }

    const body = error.error;

    if (typeof body === 'string' && body.trim()) {
      return body.toUpperCase();
    }

    if (body?.message) {
      return String(body.message).toUpperCase();
    }

    // Spring Bean Validation: { errors: { email: "...", password: "..." } }
    if (body?.errors && typeof body.errors === 'object') {
      const joined = Object.entries(body.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(' • ');
      if (joined) return joined.toUpperCase();
    }

    return (
      body?.error_description ??
      body?.error ??
      'REGISTRATION FAILED. VERIFY YOUR DETAILS AND TRY AGAIN.'
    ).toString().toUpperCase();
  }
}