import { apiService, ApiResponse } from '../api';
import { 
  OrganizationalUnit, 
  OUsResponse, 
  CreateOURequest, 
  UpdateOURequest
} from '../types';

export class OUsService {
  // Get all organizational units with optional search and filters
  async getOUs(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<OUsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/ous${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<OUsResponse>(endpoint);
  }

  // Get a specific OU by distinguished name
  async getOU(distinguishedName: string): Promise<ApiResponse<OrganizationalUnit>> {
    return apiService.get<OrganizationalUnit>(`/ous/${encodeURIComponent(distinguishedName)}`);
  }

  // Create a new organizational unit
  async createOU(ouData: CreateOURequest): Promise<ApiResponse<OrganizationalUnit>> {
    return apiService.post<OrganizationalUnit>('/ous', ouData);
  }

  // Update an existing organizational unit
  async updateOU(distinguishedName: string, ouData: UpdateOURequest): Promise<ApiResponse<OrganizationalUnit>> {
    return apiService.put<OrganizationalUnit>(`/ous/${encodeURIComponent(distinguishedName)}`, ouData);
  }

  // Delete an organizational unit
  async deleteOU(distinguishedName: string): Promise<ApiResponse> {
    return apiService.delete(`/ous/${encodeURIComponent(distinguishedName)}`);
  }

  // Get domain information
  async getDomainInfo(): Promise<ApiResponse<{ domain_info: { DomainDN: string; DomainName: string; NetBIOSName: string } }>> {
    return apiService.get<{ domain_info: { DomainDN: string; DomainName: string; NetBIOSName: string } }>('/ous/domain-info');
  }
}

export const ousService = new OUsService(); 