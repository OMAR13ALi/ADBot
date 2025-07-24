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
import { MessageService, ConfirmationService } from 'primeng/api';

// OU Model
interface OU {
  Name: string;
  DistinguishedName: string;
  Description: string;
}

// New OU Creation Model
interface NewOU {
  name: string;
  path: string;
  description?: string;
}

interface OUsResponse {
  ous: OU[];
  count: number;
  status: string;
}

@Component({
  selector: 'app-ou-list',
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

  templateUrl: './ou-list.component.html',
  styleUrl: './ou-list.component.scss'
})
export class OuListComponent implements OnInit {
  ous: OU[] = [];
  filteredOUs: OU[] = [];
  loading: boolean = false;
  totalRecords: number = 0;
  
  // Search
  searchTerm: string = '';
  
  // Pagination
  first: number = 0;
  rows: number = 10;
  
  // Selected OU for actions
  selectedOU: OU | null = null;
  
  // Dialog visibility
  showOuDetailDialog: boolean = false;
  showAddOuDialog: boolean = false;
  showEditOuDialog: boolean = false;
  
  // New OU form
  newOU: NewOU = {
    name: '',
    path: '',
    description: ''
  };
  
  // Edit OU form
  editOU: NewOU = {
    name: '',
    path: '',
    description: ''
  };
  
  // Available parent OUs for selection
  availableParentOUs: OU[] = [];
  selectedParentOU: OU | null = null;
  loadingParentOUs: boolean = false;
  
  // Form validation
  creatingOU: boolean = false;
  updatingOU: boolean = false;
  
  // Error handling
  errorMessage: string = '';

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadOUs();
    this.loadParentOUs();
  }

  loadOUs() {
    this.loading = true;
    
    // Build query parameters
    let params: any = { limit: this.rows };
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }

    this.http.get<OUsResponse>('/api/ous', { params })
      .subscribe({
        next: (response) => {
          this.ous = response.ous;
          this.filteredOUs = [...this.ous];
          this.totalRecords = response.count;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading OUs:', error);
          this.errorMessage = error.error?.detail || error.message || 'Unknown error';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load organizational units'
          });
          this.loading = false;
        }
      });
  }

  loadParentOUs() {
    this.loadingParentOUs = true;
    this.http.get<OUsResponse>('/api/ous')
      .subscribe({
        next: (response) => {
          this.availableParentOUs = response.ous;
          this.loadingParentOUs = false;
        },
        error: (error) => {
          console.error('Error loading parent OUs:', error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Failed to load parent organizational units'
          });
          this.loadingParentOUs = false;
        }
      });
  }

  openAddOuDialog() {
    this.resetNewOuForm();
    this.showAddOuDialog = true;
  }

  openEditOuDialog(ou: OU) {
    console.log('Edit OU clicked for:', ou.Name);
    try {
      this.editOU = {
        name: ou.Name,
        path: this.getParentPath(ou.DistinguishedName),
        description: ou.Description || ''
      };
      this.selectedOU = ou;
      this.showEditOuDialog = true;
      console.log('Edit dialog should now be visible:', this.showEditOuDialog);
    } catch (error) {
      console.error('Error in openEditOuDialog:', error);
    }
  }

  resetNewOuForm() {
    this.newOU = {
      name: '',
      path: '',
      description: ''
    };
    this.selectedParentOU = null;
  }

  getParentPath(distinguishedName: string): string {
    // Extract parent path from distinguished name
    const parts = distinguishedName.split(',');
    if (parts.length > 1) {
      parts.shift(); // Remove the first part (current OU)
      return parts.join(',');
    }
    return '';
  }

  createOU() {
    if (!this.validateNewOuForm()) {
      return;
    }

    this.creatingOU = true;
    
    // Prepare OU data
    const ouData = {
      name: this.newOU.name,
      path: this.selectedParentOU ? this.selectedParentOU.DistinguishedName : this.newOU.path,
      description: this.newOU.description || undefined
    };

    this.http.post('/api/ous', ouData)
      .subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Organizational unit created successfully'
          });
          this.showAddOuDialog = false;
          this.loadOUs(); // Refresh the OU list
          this.loadParentOUs(); // Refresh parent OUs
          this.creatingOU = false;
        },
        error: (error) => {
          console.error('Error creating OU:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.detail || 'Failed to create organizational unit'
          });
          this.creatingOU = false;
        }
      });
  }

  updateOU() {
    if (!this.validateEditOuForm()) {
      return;
    }

    this.updatingOU = true;
    
    // Prepare OU data
    const ouData = {
      name: this.editOU.name,
      description: this.editOU.description || undefined
    };

    this.http.put(`/api/ous/${encodeURIComponent(this.selectedOU!.DistinguishedName)}`, ouData)
      .subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Organizational unit updated successfully'
          });
          this.showEditOuDialog = false;
          this.loadOUs(); // Refresh the OU list
          this.updatingOU = false;
        },
        error: (error) => {
          console.error('Error updating OU:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.detail || 'Failed to update organizational unit'
          });
          this.updatingOU = false;
        }
      });
  }

  validateNewOuForm(): boolean {
    if (!this.newOU.name.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Name is required'
      });
      return false;
    }
    
    if (!this.selectedParentOU && !this.newOU.path.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Parent OU or path is required'
      });
      return false;
    }
    
    return true;
  }

  validateEditOuForm(): boolean {
    if (!this.editOU.name.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Name is required'
      });
      return false;
    }
    
    return true;
  }

  onSearch() {
    this.loadOUs();
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.loadOUs();
  }



  viewOuDetails(ou: OU) {
    console.log('View OU Details clicked for:', ou.Name);
    try {
      this.selectedOU = ou;
      this.showOuDetailDialog = true;
      console.log('View dialog should now be visible:', this.showOuDetailDialog);
    } catch (error) {
      console.error('Error in viewOuDetails:', error);
    }
  }

  deleteOU(ou: OU) {
    console.log('Delete OU clicked for:', ou.Name);
    try {
      this.confirmationService.confirm({
      message: `Are you sure you want to delete organizational unit "${ou.Name}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.http.delete(`/api/ous/${encodeURIComponent(ou.DistinguishedName)}`)
          .subscribe({
            next: (response: any) => {
              this.ous = this.ous.filter(o => o.DistinguishedName !== ou.DistinguishedName);
              this.filteredOUs = this.filteredOUs.filter(o => o.DistinguishedName !== ou.DistinguishedName);
              this.totalRecords--;
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Organizational unit deleted successfully'
              });
              this.loadParentOUs(); // Refresh parent OUs
            },
            error: (error) => {
              console.error('Error deleting OU:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete organizational unit'
              });
            }
          });
      }
    });
    } catch (error) {
      console.error('Error in deleteOU:', error);
    }
  }

  formatDistinguishedName(dn: string): string {
    // Format DN for better readability
    return dn.replace(/,/g, ', ');
  }

  getOuPath(dn: string): string {
    // Extract the path part of the DN
    const parts = dn.split(',');
    if (parts.length > 1) {
      parts.shift(); // Remove the first part (current OU)
      return parts.join(', ');
    }
    return 'Root';
  }
} 