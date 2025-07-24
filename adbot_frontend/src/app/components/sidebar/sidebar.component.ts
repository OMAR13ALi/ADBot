import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  menuItems = [
    { 
      label: 'Dashboard', 
      icon: 'pi pi-home', 
      route: '/dashboard',
      active: false
    },
    { 
      label: 'Users', 
      icon: 'pi pi-users', 
      route: '/users',
      active: false
    },
    { 
      label: 'Groups', 
      icon: 'pi pi-users', 
      route: '/groups',
      active: false
    },
    { 
      label: 'Organizational Units', 
      icon: 'pi pi-sitemap', 
      route: '/ous',
      active: false
    },
    { 
      label: 'Computers', 
      icon: 'pi pi-desktop', 
      route: '/computers',
      active: false
    },
    { 
      label: 'Settings', 
      icon: 'pi pi-cog', 
      route: '/settings',
      active: false
    }
  ];

  constructor(private router: Router) {
    this.updateActiveMenu();
  }

  updateActiveMenu() {
    const currentRoute = this.router.url;
    this.menuItems.forEach(item => {
      item.active = currentRoute === item.route;
    });
  }

  onMenuClick(item: any) {
    this.menuItems.forEach(menuItem => menuItem.active = false);
    item.active = true;
  }

  logout() {
    // Implement logout functionality
    console.log('Logout clicked');
  }
} 