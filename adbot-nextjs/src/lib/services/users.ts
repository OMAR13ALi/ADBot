import { apiService, ApiResponse } from '../api';
import { 
  User, 
  UsersResponse, 
  CreateUserRequest, 
  UpdateUserRequest, 
  MoveUserRequest, 
  ResetPasswordRequest,
  OrganizationalUnitsResponse
} from '../types';

export class UsersService {
  // Get all users with optional search and filters
  async getUsers(params?: {
    search?: string;
    enabled?: boolean;
    limit?: number;
  }): Promise<ApiResponse<UsersResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.enabled !== undefined) queryParams.append('enabled', params.enabled.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<UsersResponse>(endpoint);
  }

  // Get a specific user by SAM account name
  async getUser(samAccountName: string): Promise<ApiResponse<User>> {
    return apiService.get<User>(`/users/${encodeURIComponent(samAccountName)}`);
  }

  // Create a new user
  async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    return apiService.post<User>('/users', userData);
  }

  // Update an existing user
  async updateUser(samAccountName: string, userData: UpdateUserRequest): Promise<ApiResponse<User>> {
    return apiService.put<User>(`/users/${encodeURIComponent(samAccountName)}`, userData);
  }

  // Move a user to a different OU
  async moveUser(samAccountName: string, moveData: MoveUserRequest): Promise<ApiResponse> {
    return apiService.post(`/users/${encodeURIComponent(samAccountName)}/move`, moveData);
  }

  // Reset user password
  async resetPassword(samAccountName: string, resetData: ResetPasswordRequest): Promise<ApiResponse> {
    return apiService.post(`/users/${encodeURIComponent(samAccountName)}/reset-password`, resetData);
  }

  // Delete a user
  async deleteUser(samAccountName: string): Promise<ApiResponse> {
    return apiService.delete(`/users/${encodeURIComponent(samAccountName)}`);
  }

  // Enable a user (standard method)
  async enableUser(samaccountname: string): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/users/enable/${samaccountname}`);
  }

  // Force enable a user (bypasses password policy)
  async forceEnableUser(samaccountname: string): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/users/force-enable/${samaccountname}`);
  }

  // Reset password and enable user
  async resetAndEnableUser(samaccountname: string, newPassword: string = "TempPassword123!"): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/users/reset-and-enable/${samaccountname}?new_password=${encodeURIComponent(newPassword)}`);
  }

  // Disable a user
  async disableUser(samaccountname: string): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/users/disable/${samaccountname}`);
  }

  // Get user status
  async getUserStatus(samaccountname: string): Promise<ApiResponse<any>> {
    return apiService.get<any>(`/users/status/${samaccountname}`);
  }

  // Bulk enable users
  async bulkEnableUsers(samaccountnames: string[]): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/users/bulk-enable`, samaccountnames);
  }

  // Bulk disable users
  async bulkDisableUsers(samaccountnames: string[]): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/users/bulk-disable`, samaccountnames);
  }

  // Get organizational units (for user creation/move)
  async getOrganizationalUnits(): Promise<ApiResponse<OrganizationalUnitsResponse>> {
    return apiService.get<OrganizationalUnitsResponse>('/organizational-units');
  }

  // Get default user container
  async getDefaultUserContainer(): Promise<ApiResponse> {
    return apiService.get('/users/default-container');
  }
}

export const usersService = new UsersService(); 