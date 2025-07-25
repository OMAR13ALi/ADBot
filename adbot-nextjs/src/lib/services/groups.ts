import { apiService, ApiResponse } from '../api';
import { 
  Group, 
  GroupsResponse, 
  CreateGroupRequest, 
  UpdateGroupRequest, 
  MoveGroupRequest, 
  AddMemberRequest,
  OrganizationalUnitsResponse
} from '../types';

export class GroupsService {
  // Get all groups with optional search and filters
  async getGroups(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<GroupsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/groups${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<GroupsResponse>(endpoint);
  }

  // Get a specific group by SAM account name
  async getGroup(samAccountName: string): Promise<ApiResponse<Group>> {
    return apiService.get<Group>(`/groups/${encodeURIComponent(samAccountName)}`);
  }

  // Create a new group
  async createGroup(groupData: CreateGroupRequest): Promise<ApiResponse<Group>> {
    return apiService.post<Group>('/groups', groupData);
  }

  // Update an existing group
  async updateGroup(samAccountName: string, groupData: UpdateGroupRequest): Promise<ApiResponse<Group>> {
    return apiService.put<Group>(`/groups/${encodeURIComponent(samAccountName)}`, groupData);
  }

  // Move a group to a different OU
  async moveGroup(samAccountName: string, moveData: MoveGroupRequest): Promise<ApiResponse> {
    return apiService.post(`/groups/${encodeURIComponent(samAccountName)}/move`, moveData);
  }

  // Add a member to a group
  async addMember(samAccountName: string, memberData: AddMemberRequest): Promise<ApiResponse> {
    return apiService.post(`/groups/${encodeURIComponent(samAccountName)}/members`, memberData);
  }

  // Remove a member from a group
  async removeMember(samAccountName: string, memberSamAccountName: string): Promise<ApiResponse> {
    return apiService.delete(`/groups/${encodeURIComponent(samAccountName)}/members/${encodeURIComponent(memberSamAccountName)}`);
  }

  // Delete a group
  async deleteGroup(samAccountName: string): Promise<ApiResponse> {
    return apiService.delete(`/groups/${encodeURIComponent(samAccountName)}`);
  }

  // Get organizational units (for group creation/move)
  async getOrganizationalUnits(): Promise<ApiResponse<OrganizationalUnitsResponse>> {
    return apiService.get<OrganizationalUnitsResponse>('/organizational-units');
  }

  // Get member counts for all groups
  async getMemberCounts(): Promise<ApiResponse<{ member_counts: Record<string, number> }>> {
    try {
      const response = await apiService.get<{ member_counts: Record<string, number> }>('/groups/member-counts');
      if (response.error && response.error.includes('timeout')) {
        // Return empty member counts if timeout occurs
        return {
          data: { member_counts: {} },
          status: 200,
        };
      }
      return response;
    } catch (error) {
      // Return empty member counts on any error
      return {
        data: { member_counts: {} },
        status: 200,
      };
    }
  }
}

export const groupsService = new GroupsService(); 