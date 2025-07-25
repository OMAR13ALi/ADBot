import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '../../../environments/environment';

interface Group {
  Name: string;
  SamAccountName: string;
  Description: string;
  Members?: string[];
  DistinguishedName?: string;
}

interface OU {
  Name: string;
  DistinguishedName: string;
  Description: string;
}

interface User {
  Name: string;
  SamAccountName: string;
  Enabled: boolean;
}

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    TooltipModule
  ],
  templateUrl: './group-list.component.html',
  styleUrls: ['./group-list.component.scss']
})
export class GroupListComponent implements OnInit {
  groups: Group[] = [];
  organizationalUnits: OU[] = [];
  users: User[] = [];
  loading = false;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalGroups = 0;

  // Add New Group Dialog
  showAddGroupDialog = false;
  newGroup = {
    name: '',
    samaccountname: '',
    description: '',
    path: ''
  };
  creatingGroup = false;
  selectedParentOU: OU | null = null;

  // Edit Group Dialog
  showEditGroupDialog = false;
  editingGroup: Group | null = null;
  editForm = {
    name: '',
    description: ''
  };
  updatingGroup = false;

  // Group Details Dialog
  showGroupDetailsDialog = false;
  selectedGroup: Group | null = null;

  // Add Member Dialog
  showAddMemberDialog = false;
  selectedGroupForMember: Group | null = null;
  selectedUser: User | null = null;
  addingMember = false;

  // Move Group Dialog
  showMoveGroupDialog = false;
  selectedGroupForMove: Group | null = null;
  selectedTargetOU: OU | null = null;
  movingGroup = false;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadGroups();
    this.loadOrganizationalUnits();
    this.loadUsers();
  }

  loadGroups() {
    this.loading = true;
    this.http.get<{groups: Group[], count: number}>(`${environment.apiUrl}/groups`)
      .subscribe({
        next: (response) => {
          this.groups = response.groups || [];
          this.totalGroups = response.count || 0;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading groups:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load groups'
          });
          this.loading = false;
        }
      });
  }

  loadOrganizationalUnits() {
    this.http.get<{organizational_units: OU[], count: number}>(`${environment.apiUrl}/organizational-units`)
      .subscribe({
        next: (response) => {
          this.organizationalUnits = response.organizational_units || [];
        },
        error: (error) => {
          console.error('Error loading OUs:', error);
        }
      });
  }

  loadUsers() {
    this.http.get<{users: User[], count: number}>(`${environment.apiUrl}/users`)
      .subscribe({
        next: (response) => {
          this.users = response.users || [];
        },
        error: (error) => {
          console.error('Error loading users:', error);
        }
      });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadGroups();
  }

  onPageChange(event: any) {
    this.currentPage = event.page + 1;
    this.pageSize = event.rows;
    this.loadGroups();
  }

  openAddGroupDialog() {
    this.showAddGroupDialog = true;
    this.resetNewGroupForm();
  }

  resetNewGroupForm() {
    this.newGroup = {
      name: '',
      samaccountname: '',
      description: '',
      path: ''
    };
    this.selectedParentOU = null;
  }

  getParentPath(): string {
    if (this.selectedParentOU) {
      return this.selectedParentOU.DistinguishedName;
    }
    return this.newGroup.path;
  }

  createGroup() {
    if (!this.validateNewGroupForm()) {
      return;
    }

    this.creatingGroup = true;
    const groupData = {
      name: this.newGroup.name,
      samaccountname: this.newGroup.samaccountname,
      description: this.newGroup.description,
      path: this.getParentPath()
    };

    this.http.post(`${environment.apiUrl}/groups`, groupData)
      .subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Group created successfully'
          });
          this.showAddGroupDialog = false;
          this.loadGroups();
          this.creatingGroup = false;
        },
        error: (error) => {
          console.error('Error creating group:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.detail || 'Failed to create group'
          });
          this.creatingGroup = false;
        }
      });
  }

  validateNewGroupForm(): boolean {
    if (!this.newGroup.name.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Group name is required'
      });
      return false;
    }
    if (!this.newGroup.samaccountname.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'SAM Account Name is required'
      });
      return false;
    }
    if (!this.getParentPath()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a parent OU or enter a path'
      });
      return false;
    }
    return true;
  }

  openEditGroupDialog(group: Group) {
    this.editingGroup = group;
    this.editForm = {
      name: group.Name,
      description: group.Description || ''
    };
    this.showEditGroupDialog = true;
  }

  updateGroup() {
    if (!this.editingGroup) return;

    this.updatingGroup = true;
    const updateData = {
      name: this.editForm.name,
      description: this.editForm.description
    };

    this.http.put(`${environment.apiUrl}/groups/${this.editingGroup.SamAccountName}`, updateData)
      .subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Group updated successfully'
          });
          this.showEditGroupDialog = false;
          this.loadGroups();
          this.updatingGroup = false;
        },
        error: (error) => {
          console.error('Error updating group:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.detail || 'Failed to update group'
          });
          this.updatingGroup = false;
        }
      });
  }

  viewGroupDetails(group: Group) {
    this.selectedGroup = group;
    this.showGroupDetailsDialog = true;
  }

  openAddMemberDialog(group: Group) {
    this.selectedGroupForMember = group;
    this.selectedUser = null;
    this.showAddMemberDialog = true;
  }

  addMemberToGroup() {
    if (!this.selectedGroupForMember || !this.selectedUser) return;

    this.addingMember = true;
    const memberData = {
      user_samaccountname: this.selectedUser.SamAccountName
    };

    this.http.post(`${environment.apiUrl}/groups/${this.selectedGroupForMember.SamAccountName}/members`, memberData)
      .subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'User added to group successfully'
          });
          this.showAddMemberDialog = false;
          this.loadGroups();
          this.addingMember = false;
        },
        error: (error) => {
          console.error('Error adding member:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.detail || 'Failed to add user to group'
          });
          this.addingMember = false;
        }
      });
  }

  removeMemberFromGroup(group: Group, memberSamAccountName: string) {
    this.confirmationService.confirm({
      message: `Are you sure you want to remove ${memberSamAccountName} from the group ${group.Name}?`,
      header: 'Confirm Removal',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.http.delete(`${environment.apiUrl}/groups/${group.SamAccountName}/members/${memberSamAccountName}`)
          .subscribe({
            next: (response: any) => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'User removed from group successfully'
              });
              this.loadGroups();
            },
            error: (error) => {
              console.error('Error removing member:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: error.error?.detail || 'Failed to remove user from group'
              });
            }
          });
      }
    });
  }

  openMoveGroupDialog(group: Group) {
    this.selectedGroupForMove = group;
    this.selectedTargetOU = null;
    this.showMoveGroupDialog = true;
  }

  moveGroup() {
    if (!this.selectedGroupForMove || !this.selectedTargetOU) return;

    this.movingGroup = true;
    const moveData = {
      target_ou: this.selectedTargetOU.DistinguishedName
    };

    this.http.post(`${environment.apiUrl}/groups/${this.selectedGroupForMove.SamAccountName}/move`, moveData)
      .subscribe({
        next: (response: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Group moved successfully'
          });
          this.showMoveGroupDialog = false;
          this.loadGroups();
          this.movingGroup = false;
        },
        error: (error) => {
          console.error('Error moving group:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.detail || 'Failed to move group'
          });
          this.movingGroup = false;
        }
      });
  }

  deleteGroup(group: Group) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the group "${group.Name}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.http.delete(`${environment.apiUrl}/groups/${group.SamAccountName}`)
          .subscribe({
            next: (response: any) => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Group deleted successfully'
              });
              this.loadGroups();
            },
            error: (error) => {
              console.error('Error deleting group:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: error.error?.detail || 'Failed to delete group'
              });
            }
          });
      }
    });
  }

  formatDistinguishedName(dn: string): string {
    if (!dn) return '';
    return dn.split(',').map(part => part.replace(/^[A-Z]+=/, '')).join(' > ');
  }
}
