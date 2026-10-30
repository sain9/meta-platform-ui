import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { SchemaManager } from './pages/schema-manager/schema-manager';
import { authGuard } from './core/auth-guard';

export const routes: Routes = [
  { path: 'register', component: Register },
  { path: 'login', component: Login },
  // { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'schemas', component: SchemaManager, canActivate: [authGuard] },
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: '**', redirectTo: '/register' },
];  