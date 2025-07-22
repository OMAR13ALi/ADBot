import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface DashboardStats {
  totalUsers: number;
  activeGroups: number;
  computers: number;
  systemHealth: number;
}

interface ActivityItem {
  type: 'success' | 'warning' | 'danger' | 'info';
  description: string;
  user: string;
  time: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    totalUsers: 1234,
    activeGroups: 56,
    computers: 892,
    systemHealth: 98.2
  };

  recentActivity: ActivityItem[] = [
    {
      type: 'success',
      description: 'Created new user account',
      user: 'John Doe',
      time: '2 minutes ago'
    },
    {
      type: 'warning',
      description: 'Updated group permissions',
      user: 'Admin',
      time: '5 minutes ago'
    },
    {
      type: 'danger',
      description: 'Disabled user account',
      user: 'Sarah Wilson',
      time: '12 minutes ago'
    },
    {
      type: 'success',
      description: 'Added computer to domain',
      user: 'Mike Johnson',
      time: '1 hour ago'
    }
  ];

  quickActions: QuickAction[] = [
    {
      title: 'Create New User',
      description: 'Add a new Active Directory account',
      icon: 'pi pi-user-plus',
      route: '/users'
    },
    {
      title: 'Manage Groups',
      description: 'Create or modify security groups',
      icon: 'pi pi-users',
      route: '/groups'
    },
    {
      title: 'System Reports',
      description: 'Generate compliance reports',
      icon: 'pi pi-chart-bar',
      route: '/settings'
    }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    // Load real data from your API
    // this.http.get('/api/dashboard/stats').subscribe(...)
    // this.http.get('/api/dashboard/activity').subscribe(...)
  }

  getStatusColor(type: string): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  getStatusIcon(type: string): string {
    switch (type) {
      case 'success': return 'pi pi-check-circle';
      case 'warning': return 'pi pi-exclamation-triangle';
      case 'danger': return 'pi pi-times-circle';
      case 'info': return 'pi pi-info-circle';
      default: return 'pi pi-circle';
    }
  }
}
