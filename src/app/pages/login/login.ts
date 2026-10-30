import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly infoMessage = signal('');

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    const state = history.state as { registeredUsername?: string };
    if (state?.registeredUsername) {
      this.form.patchValue({ username: state.registeredUsername });
      this.infoMessage.set('ACCOUNT CREATED — SIGN IN TO CONTINUE.');
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        // Sanity check: is the token really stored?
        if (!this.auth.isLoggedIn()) {
          this.errorMessage.set('Login succeeded but no token was stored.');
          return;
        }
        void this.router.navigate(['/schemas']);
      },
      error: (err) => {
        this.submitting.set(false);
        console.error('[login] failed:', err);

        // Plain Error (thrown in service tap) — show its message
        if (err instanceof Error && err.message) {
          this.errorMessage.set(err.message);
          return;
        }

        // HttpErrorResponse
        const serverMsg =
          err?.error?.message ?? err?.error?.error ?? err?.error?.detail;
        if (serverMsg) {
          this.errorMessage.set(String(serverMsg));
        } else if (err?.status === 401) {
          this.errorMessage.set('Invalid username or password.');
        } else if (err?.status === 500) {
          this.errorMessage.set('Server error — check backend logs.');
        } else if (err?.status === 0) {
          this.errorMessage.set('Cannot reach server. Is the gateway running?');
        } else {
          this.errorMessage.set('Login failed.');
        }
      },
    });
  }
}