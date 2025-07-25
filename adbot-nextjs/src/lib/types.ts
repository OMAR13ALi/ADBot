// AD Bot Data Models

// User Models
export interface User {
  Name: string;
  SamAccountName: string;
  Enabled: boolean;
  DistinguishedName?: string;
  Description?: string;
  EmailAddress?: string;
  GivenName?: string;
  Surname?: string;
  DisplayName?: string;
  UserPrincipalName?: string;
  PasswordLastSet?: string;
  LastLogon?: string;
  MemberOf?: string[];
}

export interface CreateUserRequest {
  name: string;
  samaccountname: string;
  password: string;
  enabled?: boolean;
  description?: string;
  email?: string;
  given_name?: string;
  surname?: string;
  display_name?: string;
  user_principal_name?: string;
  path?: string;
}

export interface UpdateUserRequest {
  name?: string;
  description?: string;
  email?: string;
  given_name?: string;
  surname?: string;
  display_name?: string;
  user_principal_name?: string;
  enabled?: boolean;
}

export interface MoveUserRequest {
  target_ou: string;
}

export interface ResetPasswordRequest {
  new_password: string;
  force_change?: boolean;
}

// Group Models
export interface Group {
  Name: string;
  SamAccountName: string;
  Description: string;
  Members?: string[];
  DistinguishedName?: string;
}

export interface CreateGroupRequest {
  name: string;
  samaccountname: string;
  description?: string;
  path?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface MoveGroupRequest {
  target_ou: string;
}

export interface AddMemberRequest {
  user_samaccountname: string;
}

// OU Models
export interface OrganizationalUnit {
  Name: string;
  DistinguishedName: string;
  Description: string;
}

export interface CreateOURequest {
  name: string;
  path: string;
  description?: string;
}

export interface UpdateOURequest {
  name?: string;
  description?: string;
}

// Computer Models
export interface Computer {
  Name: string;
  SamAccountName: string;
  Description?: string;
  DistinguishedName?: string;
  Enabled?: boolean;
  OperatingSystem?: string;
  LastLogonDate?: string;
}

// API Response Models
export interface UsersResponse {
  users: User[];
  count: number;
  status: string;
}

export interface GroupsResponse {
  groups: Group[];
  count: number;
  status: string;
}

export interface OUsResponse {
  ous: OrganizationalUnit[];
  count: number;
  status: string;
}

export interface ComputersResponse {
  computers: Computer[];
  count: number;
  status: string;
}

export interface OrganizationalUnitsResponse {
  organizational_units: OrganizationalUnit[];
  count: number;
  status: string;
}

// Connection Test
export interface ConnectionTestResponse {
  message: string;
}

// Dashboard Types
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