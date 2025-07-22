import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Computer {
  Name: string;
  SamAccountName: string;
  OperatingSystem?: string;
  LastLogonDate?: string;
  Description?: string;
  DistinguishedName: string;
  Enabled?: boolean;
  Created?: string;
  Modified?: string;
}

interface ComputersResponse {
  computers: Computer[];
  count: number;
  status: string;
  filters_applied?: any;
}

interface ComputerMove {
  target_ou: string;
}

@Component({
  selector: 'app-computer-list',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './computer-list.component.html',
  styleUrl: './computer-list.component.scss'
})
export class ComputerListComponent implements OnInit {
  computers: Computer[] = [];
  filteredComputers: Computer[] = [];
  loading: boolean = false;
  totalRecords: number = 0;

  // Search and Filter
  searchTerm: string = '';

  // Pagination
  first: number = 0;
  rows: number = 10;

  // Selected computer for actions
  selectedComputer: Computer | null = null;

  // Dialog visibility
  showComputerDetailDialog: boolean = false;
  showMoveComputerDialog: boolean = false;

  // Form data
  moveRequest: ComputerMove = { target_ou: '' };

  // Available OUs for moving computers
  availableOUs: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadComputers();
    this.loadOrganizationalUnits();
  }

  loadComputers() {
    this.loading = true;
    let params: any = { limit: this.rows };
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }
    this.http.get<ComputersResponse>('/api/computers', { params })
      .subscribe({
        next: (response) => {
          this.computers = response.computers;
          this.filteredComputers = [...this.computers];
          this.totalRecords = response.count;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading computers:', error);
          this.loading = false;
        }
      });
  }

  loadOrganizationalUnits() {
    this.http.get('/api/organizational-units')
      .subscribe({
        next: (response: any) => {
          this.availableOUs = response.organizational_units || [];
        },
        error: (error) => {
          console.error('Error loading OUs:', error);
        }
      });
  }

  onSearch() {
    this.loadComputers();
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.loadComputers();
  }

  viewComputerDetails(computer: Computer) {
    this.selectedComputer = computer;
    this.showComputerDetailDialog = true;
  }

  moveComputer(computer: Computer) {
    this.selectedComputer = computer;
    this.moveRequest = { target_ou: '' };
    this.showMoveComputerDialog = true;
  }

  submitMoveComputer() {
    if (!this.selectedComputer || !this.moveRequest.target_ou) {
      return;
    }
    this.http.post(`/api/computers/${this.selectedComputer.SamAccountName}/move`, this.moveRequest)
      .subscribe({
        next: (response: any) => {
          this.showMoveComputerDialog = false;
          this.loadComputers();
        },
        error: (error) => {
          console.error('Error moving computer:', error);
        }
      });
  }

  deleteComputer(computer: Computer) {
    if (confirm(`Are you sure you want to delete computer "${computer.Name}"? This action cannot be undone.`)) {
      this.http.delete(`/api/computers/${computer.SamAccountName}`)
        .subscribe({
          next: (response: any) => {
            this.computers = this.computers.filter(c => c.SamAccountName !== computer.SamAccountName);
            this.filteredComputers = this.filteredComputers.filter(c => c.SamAccountName !== computer.SamAccountName);
            this.totalRecords--;
          },
          error: (error) => {
            console.error('Error deleting computer:', error);
          }
        });
    }
  }

  formatDate(dateString: string): string {
    if (!dateString || dateString === 'Never') {
      return 'Never';
    }
    return new Date(dateString).toLocaleDateString();
  }
}
