import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

type NavItem = { label: string; icon: string; path?: string };
type ServiceItem = { name: string; icon: string; status: string; tone: string; path?: string };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'home' },
    { label: 'Data Explorer', icon: 'database' },
    { label: 'Workflows', icon: 'workflow' },
    { label: 'Entities', icon: 'box', path: '/schemas' },
    { label: 'Users', icon: 'users' },
    { label: 'Settings', icon: 'settings' },
  ];

  activeNav = 'Dashboard';
  period = 'Last 30 Days';
  profileMenuOpen = false;

  readonly stats = [
    { label: 'Total Records', value: '24.8M', change: '12.5%', icon: 'database', tone: 'cyan', points: '0,36 24,31 48,34 72,22 96,25 120,14 144,20 168,8 192,14 216,3' },
    { label: 'Active Users', value: '12.4K', change: '8.1%', icon: 'users', tone: 'purple', points: '0,34 24,29 48,32 72,24 96,26 120,16 144,20 168,9 192,13 216,2' },
    { label: 'Uptime', value: '99.9%', change: '0.1%', icon: 'bolt', tone: 'green', points: '0,35 24,30 48,33 72,19 96,23 120,12 144,16 168,7 192,11 216,1' },
    { label: 'Storage Used', value: '342 GB', change: '14.3%', icon: 'server', tone: 'blue', points: '0,35 24,32 48,26 72,29 96,18 120,23 144,12 168,17 192,7 216,3' }
  ];

  readonly activities = [
    { title: 'User registered', detail: 'john.doe@meta.com', time: '2 min ago', icon: 'check', tone: 'green' },
    { title: 'New entity created', detail: 'products', time: '5 min ago', icon: 'box', tone: 'blue' },
    { title: 'Workflow executed', detail: 'data-sync-flow', time: '8 min ago', icon: 'play', tone: 'purple' },
    { title: 'Data updated', detail: 'orders', time: '12 min ago', icon: 'refresh', tone: 'green' }
  ];

  readonly services: ServiceItem[] = [
    { name: 'Data API', icon: 'database', status: 'Running', tone: 'cyan' },
    { name: 'Definition API', icon: 'file', status: 'Running', tone: 'blue' },
    { name: 'Entities', icon: 'box', status: 'Running', tone: 'cyan', path: '/schemas' },
    { name: 'Workflow Orchestrator', icon: 'workflow', status: 'Running', tone: 'purple' }
  ];

  readonly tenants = [
    { name: 'acme-corp', users: '4,860', storage: '120 GB', status: 'Active' },
    { name: 'globex-ltd', users: '3,240', storage: '86 GB', status: 'Active' },
    { name: 'initech', users: '2,110', storage: '54 GB', status: 'Active' }
  ];

  // Kept for backward compatibility — updates state without navigation
  selectNav(item: NavItem): void {
    this.activeNav = item.label;
  }

  // Used by sidebar nav <div> — updates state and navigates if item has a path
  onNavClick(item: NavItem): void {
    this.activeNav = item.label;
    if (item.path) {
      void this.router.navigate([item.path]);
    }
  }

  // Used by "Your Services" cards — navigates only when path is present
  openPath(path?: string): void {
    if (path) {
      void this.router.navigate([path]);
    }
  }

  setPeriod(value: string): void {
    this.period = value;
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }
}