import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UserListComponent } from './components/user-list/user-list.component';
import { GroupListComponent } from './components/group-list/group-list.component';
import { OuListComponent } from './components/ou-list/ou-list.component';
import { ComputerListComponent } from './components/computer-list/computer-list.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'users', component: UserListComponent },
  { path: 'groups', component: GroupListComponent },
  { path: 'ous', component: OuListComponent },
  { path: 'computers', component: ComputerListComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '/dashboard' }
];