import { apiService, ApiResponse } from '../api';

export interface DashboardStats {
  total_users: number;
  total_groups: number;
  total_computers: number;
  total_ous: number;
  recent_activity?: Array<{
    action: string;
    timestamp: string;
    details: string;
  }>;
}

export class DashboardService {
  // Get dashboard statistics
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    return apiService.get<DashboardStats>('/dashboard/stats');
  }
}

export const dashboardService = new DashboardService(); 