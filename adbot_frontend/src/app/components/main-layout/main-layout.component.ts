import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  constructor(private router: Router) {}

  getPageTitle(): string {
    const path = this.router.url;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/users':
        return 'User Management';
      case '/groups':
        return 'Group Management';
      case '/computers':
        return 'Computer Management';
      case '/settings':
        return 'Settings';
      default:
        return 'ADBot Management Suite';
    }
  }

  getPageSubtitle(): string {
    const path = this.router.url;
    switch (path) {
      case '/dashboard':
        return 'Overview of your Active Directory environment';
      case '/users':
        return 'Manage user accounts and permissions';
      case '/groups':
        return 'Create and manage security groups';
      case '/computers':
        return 'Monitor and manage domain computers';
      case '/settings':
        return 'Configure system settings and preferences';
      default:
        return 'Active Directory Management Tool';
    }
  }
} 