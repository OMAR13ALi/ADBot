import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Group Models
interface Group {
  Name: string;
  SamAccountName: string;
  Description: string;
  DistinguishedName: string;
  Members?: string[];
  GroupScope?: string;
  GroupCategory?: string;
  Created?: string;
  Modified?: string;
}

interface GroupsResponse {
  groups: Group[];
  count: number;
  status: string;
  filters_applied?: any;
}

interface GroupMember {
  user_samaccountname: string;
}

interface GroupMove {
  target_ou: string;
}

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss'
})
export class GroupListComponent implements OnInit {
  groups: Group[] = [];
  filteredGroups: Group[] = [];
  loading: boolean = false;
  totalRecords: number = 0;
  
  // Search and Filter
  searchTerm: string = '';
  
  // Pagination
  first: number = 0;
  rows: number = 10;
  
  // Selected group for actions
  selectedGroup: Group | null = null;
  
  // Dialog visibility
  showGroupDetailDialog: boolean = false;
  showAddMemberDialog: boolean = false;
  showMoveGroupDialog: boolean = false;
  
  // Form data
  newMember: GroupMember = { user_samaccountname: '' };
  moveRequest: GroupMove = { target_ou: '' };
  
  // Available OUs for moving groups
  availableOUs: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadGroups();
    this.loadOrganizationalUnits();
  }

  loadGroups() {
    this.loading = true;
    
    // Build query parameters
    let params: any = { limit: this.rows };
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }

    this.http.get<GroupsResponse>('/api/groups', { params })
      .subscribe({
        next: (response) => {
          this.groups = response.groups;
          this.filteredGroups = [...this.groups];
          this.totalRecords = response.count;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading groups:', error);
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
    this.loadGroups();
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.loadGroups();
  }

  viewGroupDetails(group: Group) {
    this.selectedGroup = group;
    this.showGroupDetailDialog = true;
  }

  addMemberToGroup(group: Group) {
    this.selectedGroup = group;
    this.newMember = { user_samaccountname: '' };
    this.showAddMemberDialog = true;
  }

  submitAddMember() {
    if (!this.selectedGroup || !this.newMember.user_samaccountname) {
      return;
    }

    this.http.post(`/api/groups/${this.selectedGroup.SamAccountName}/members`, this.newMember)
      .subscribe({
        next: (response: any) => {
          this.showAddMemberDialog = false;
          this.loadGroups(); // Refresh the list
          // You could add a toast notification here
        },
        error: (error) => {
          console.error('Error adding member to group:', error);
        }
      });
  }

  removeMemberFromGroup(group: Group, memberUsername: string) {
    if (confirm(`Are you sure you want to remove ${memberUsername} from ${group.Name}?`)) {
      this.http.delete(`/api/groups/${group.SamAccountName}/members/${memberUsername}`)
        .subscribe({
          next: (response: any) => {
            this.loadGroups(); // Refresh the list
            // You could add a toast notification here
          },
          error: (error) => {
            console.error('Error removing member from group:', error);
          }
        });
    }
  }

  moveGroup(group: Group) {
    this.selectedGroup = group;
    this.moveRequest = { target_ou: '' };
    this.showMoveGroupDialog = true;
  }

  submitMoveGroup() {
    if (!this.selectedGroup || !this.moveRequest.target_ou) {
      return;
    }

    this.http.post(`/api/groups/${this.selectedGroup.SamAccountName}/move`, this.moveRequest)
      .subscribe({
        next: (response: any) => {
          this.showMoveGroupDialog = false;
          this.loadGroups(); // Refresh the list
          // You could add a toast notification here
        },
        error: (error) => {
          console.error('Error moving group:', error);
        }
      });
  }

  deleteGroup(group: Group) {
    if (confirm(`Are you sure you want to delete group "${group.Name}"? This action cannot be undone.`)) {
      this.http.delete(`/api/groups/${group.SamAccountName}`)
        .subscribe({
          next: (response: any) => {
            this.groups = this.groups.filter(g => g.SamAccountName !== group.SamAccountName);
            this.filteredGroups = this.filteredGroups.filter(g => g.SamAccountName !== group.SamAccountName);
            this.totalRecords--;
            // You could add a toast notification here
          },
          error: (error) => {
            console.error('Error deleting group:', error);
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

  getMemberCount(group: Group): number {
    return group.Members ? group.Members.length : 0;
  }
}
