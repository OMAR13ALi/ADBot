import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
// DropdownModule not available, using select element instead
import { MessageService, ConfirmationService } from 'primeng/api';

// User Model
interface User {
  Name: string;
  SamAccountName: string;
  Enabled: boolean;
  LastLogonDate: string;
  Description: string;
  Department: string;
  EmailAddress?: string;
  Title?: string;
  OfficePhone?: string;
  Manager?: string;
  DistinguishedName?: string;
  Created?: string;
  Modified?: string;
  PasswordLastSet?: string;
  AccountExpirationDate?: string;
  LockedOut?: boolean;
  PasswordExpired?: boolean;
  PasswordNeverExpires?: boolean;
  MemberOf?: string[];
}

// New User Creation Model
interface NewUser {
  name: string;
  samaccountname: string;
  password: string;
  enabled: boolean;
  description?: string;
  email?: string;
  department?: string;
  title?: string;
  phone?: string;
  manager?: string;
  ou?: string;
}

// OU Model
interface OU {
  Name: string;
  DistinguishedName: string;
  Description: string;
}

interface UsersResponse {
  users: User[];
  count: number;
  status: string;
  filters_applied?: any;
}

interface OUsResponse {
  organizational_units: OU[];
  count: number;
  status: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],

  templateUrl: './user-list.html',
  styleUrl: './user-list.scss'
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  loading: boolean = false;
  totalRecords: number = 0;
  
  // Search and Filter
  searchTerm: string = '';
  enabledFilter: boolean | null = null;
  
  // Pagination
  first: number = 0;
  rows: number = 10;
  
  // Selected user for actions
  selectedUser: User | null = null;
  
  // Dialog visibility
  showUserDetailDialog: boolean = false;
  showAddUserDialog: boolean = false;
  
  // New user form
  newUser: NewUser = {
    name: '',
    samaccountname: '',
    password: '',
    enabled: true,
    description: '',
    email: '',
    department: '',
    title: '',
    phone: '',
    manager: '',
    ou: ''
  };
  
  // OU selection
  availableOUs: OU[] = [];
  selectedOU: OU | null = null;
  loadingOUs: boolean = false;
  
  // Form validation
  creatingUser: boolean = false;
  
  // Status options for filter
  statusOptions = [
    { label: 'All Users', value: null },
    { label: 'Enabled Only', value: true },
    { label: 'Disabled Only', value: false }
  ];

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    console.log('UserListComponent initialized');
    this.loadUsers();
    this.loadOrganizationalUnits();
  }

  loadUsers() {
    this.loading = true;
    
    // Build query parameters
    let params: any = { limit: this.rows };
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }
    if (this.enabledFilter !== null) {
      params.enabled = this.enabledFilter;
    }

    this.http.get<UsersResponse>('/api/users', { params })
      .subscribe({
        next: (response) => {
          this.users = response.users;
          this.filteredUsers = [...this.users];
          this.totalRecords = response.count;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load users'
          });
          this.loading = false;
        }
      });
  }

  loadOrganizationalUnits() {
    this.loadingOUs = true;
    this.http.get<OUsResponse>('/api/organizational-units')
      .subscribe({
        next: (response) => {
          this.availableOUs = response.organizational_units;
          this.loadingOUs = false;
        },
        error: (error) => {
          console.error('Error loading OUs:', error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Failed to load organizational units. Users will be created in default container.'
          });
          this.loadingOUs = false;
        }
      });
  }

  openAddUserDialog() {
    console.log('openAddUserDialog called');
    alert('Button clicked! Dialog should open now.');
    this.resetNewUserForm();
    this.showAddUserDialog = true;
    console.log('showAddUserDialog set to:', this.showAddUserDialog);
  }

  resetNewUserForm() {
    this.newUser = {
      name: '',
      samaccountname: '',
      password: '',
      enabled: true,
      description: '',
      email: '',
      department: '',
      title: '',
      phone: '',
      manager: '',
      ou: ''
    };
    this.selectedOU = null;
  }

  createUser() {
    if (!this.validateNewUserForm()) {
      return;
    }

    this.creatingUser = true;
    
    // Prepare user data
    const userData = {
      name: this.newUser.name,
      samaccountname: this.newUser.samaccountname,
      password: this.newUser.password,
      enabled: this.newUser.enabled,
      description: this.newUser.description || undefined,
      email: this.newUser.email || undefined,
      department: this.newUser.department || undefined,
      title: this.newUser.title || undefined,
      phone: this.newUser.phone || undefined,
      manager: this.newUser.manager || undefined,
      ou: this.selectedOU ? this.selectedOU.DistinguishedName : undefined
    };

    this.http.post('/api/users', userData)
      .subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'User created successfully'
          });
          this.showAddUserDialog = false;
          this.loadUsers(); // Refresh the user list
          this.creatingUser = false;
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.detail || 'Failed to create user'
          });
          this.creatingUser = false;
        }
      });
  }

  validateNewUserForm(): boolean {
    if (!this.newUser.name.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Name is required'
      });
      return false;
    }
    
    if (!this.newUser.samaccountname.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Username is required'
      });
      return false;
    }
    
    if (!this.newUser.password.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Password is required'
      });
      return false;
    }
    
    if (this.newUser.password.length < 8) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Password must be at least 8 characters long'
      });
      return false;
    }
    
    return true;
  }

  onSearch() {
    this.loadUsers();
  }

  onFilterChange() {
    this.loadUsers();
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.loadUsers();
  }

  toggleUserStatus(user: User) {
    const newStatus = !user.Enabled;
    const action = newStatus ? 'enable' : 'disable';
    
    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} user "${user.Name}"?`,
      header: 'Confirm Action',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.updateUserStatus(user, newStatus);
      }
    });
  }

  updateUserStatus(user: User, enabled: boolean) {
    const endpoint = enabled ? 'enable' : 'disable';
    this.http.put(`/api/users/${endpoint}/${user.SamAccountName}`)
      .subscribe({
        next: (response: any) => {
          // Update the user's enabled status
          user.Enabled = enabled;
          
          // Show success message
          const message = enabled ? 'enabled' : 'disabled';
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `User ${message} successfully`
          });
          
          // Log the response for debugging
          console.log('User status update response:', response);
        },
        error: (error) => {
          console.error('Error updating user status:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to ${enabled ? 'enable' : 'disable'} user: ${error.error?.detail || error.message}`
          });
        }
      });
  }

  viewUserDetails(user: User) {
    this.selectedUser = user;
    this.showUserDetailDialog = true;
  }

  deleteUser(user: User) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete user "${user.Name}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.http.delete(`/api/users/${user.SamAccountName}`)
          .subscribe({
            next: (response: any) => {
              this.users = this.users.filter(u => u.SamAccountName !== user.SamAccountName);
              this.filteredUsers = this.filteredUsers.filter(u => u.SamAccountName !== user.SamAccountName);
              this.totalRecords--;
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'User deleted successfully'
              });
            },
            error: (error) => {
              console.error('Error deleting user:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete user'
              });
            }
          });
      }
    });
  }

  resetPassword(user: User) {
    this.confirmationService.confirm({
      message: `Are you sure you want to reset password for user "${user.Name}"?`,
      header: 'Confirm Password Reset',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // This would typically open a dialog to enter new password
        this.messageService.add({
          severity: 'info',
          summary: 'Info',
          detail: 'Password reset functionality to be implemented'
        });
      }
    });
  }

  getStatusSeverity(enabled: boolean): string {
    return enabled ? 'success' : 'danger';
  }

  getStatusIcon(enabled: boolean): string {
    return enabled ? 'pi pi-check-circle' : 'pi pi-times-circle';
  }

  formatDate(dateString: string): string {
    if (!dateString || dateString === 'Never') {
      return 'Never';
    }
    return new Date(dateString).toLocaleDateString();
  }
}
