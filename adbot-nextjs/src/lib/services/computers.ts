import { apiService, ApiResponse } from '../api';
import { 
  Computer, 
  ComputersResponse
} from '../types';

export class ComputersService {
  // Get all computers with optional search and filters
  async getComputers(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<ComputersResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/computers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<ComputersResponse>(endpoint);
  }

  // Get a specific computer by name
  async getComputer(name: string): Promise<ApiResponse<Computer>> {
    return apiService.get<Computer>(`/computers/${encodeURIComponent(name)}`);
  }
}

export const computersService = new ComputersService(); 