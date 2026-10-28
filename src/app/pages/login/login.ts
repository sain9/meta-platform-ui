import { Component, inject, signal } from '@angular/core';
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
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly infoMessage = signal('');

ngOnInit(): void {
  const state = history.state as { registeredUsername?: string };
  if (state?.registeredUsername) {
    this.form.patchValue({ username: state.registeredUsername });
    this.infoMessage.set('ACCOUNT CREATED — SIGN IN TO CONTINUE.');
  }
}

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(3)]],
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Invalid username or password'
        );
      },
    });
  }
}