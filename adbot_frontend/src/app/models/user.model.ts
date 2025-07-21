export interface User {
    Name: string;
    SamAccountName: string;
    Enabled: boolean;
    LastLogonDate: string;
    Description: string | null;
    Department: string | null;
  }
  
  export interface UsersResponse {
    users: User[];
    count: number;
    status: string;
    filters_applied: {
      search: string | null;
      enabled: boolean | null;
      limit: number;
    };
  }
  