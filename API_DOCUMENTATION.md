# ADBot API Documentation

## Table of Contents

1. [Authentication API](#authentication-api)
2. [Core FastAPI Services](#core-fastapi-services)
3. [Frontend Components](#frontend-components)
4. [Client Services](#client-services)
5. [Data Models](#data-models)
6. [Usage Examples](#usage-examples)

---

## Authentication API

The Authentication API provides secure Windows credential validation and JWT token management for the ADBot system.

### Base URL
```
http://localhost:8001
```

### Endpoints

#### POST /login
Authenticate user credentials and establish WinRM connection.

**Request Body:**
```json
{
  "username": "string",
  "password": "string", 
  "server_ip": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": 1800,
  "user_info": {
    "username": "string",
    "server_ip": "string",
    "auth_method": "basic|negotiate"
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:8001/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123",
    "server_ip": "192.168.1.100"
  }'
```

#### GET /verify
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user_info": {
    "username": "string",
    "server_ip": "string"
  },
  "expires_at": "2024-01-01T12:00:00Z"
}
```

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "AD Bot Authentication API",
  "version": "1.0.0"
}
```

---

## Core FastAPI Services

The main FastAPI application provides comprehensive Active Directory management capabilities.

### Base URL
```
http://localhost:8000
```

### User Management API

#### GET /users
List all Active Directory users with optional filtering.

**Query Parameters:**
- `search` (optional): Search term for username or display name
- `enabled` (optional): Filter by enabled status (true/false)
- `department` (optional): Filter by department
- `ou` (optional): Filter by Organizational Unit
- `limit` (optional): Maximum results (1-1000, default: 100)
- `offset` (optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "users": [
    {
      "samaccountname": "john.doe",
      "name": "John Doe",
      "enabled": true,
      "email": "john.doe@company.com",
      "department": "IT",
      "title": "Software Engineer",
      "last_logon_date": "2024-01-01T10:30:00Z",
      "distinguished_name": "CN=John Doe,OU=IT,DC=company,DC=com",
      "created": "2023-06-15T09:00:00Z",
      "modified": "2024-01-01T10:30:00Z"
    }
  ],
  "count": 1,
  "total_available": 150,
  "filters_applied": {
    "enabled": true,
    "department": "IT"
  }
}
```

#### GET /users/{samaccountname}
Get specific user details.

**Path Parameters:**
- `samaccountname`: Username (e.g., "john.doe")

**Response:**
```json
{
  "samaccountname": "john.doe",
  "name": "John Doe",
  "enabled": true,
  "email": "john.doe@company.com",
  "department": "IT",
  "title": "Software Engineer",
  "phone": "+1-555-0123",
  "manager": "jane.smith",
  "last_logon_date": "2024-01-01T10:30:00Z",
  "distinguished_name": "CN=John Doe,OU=IT,DC=company,DC=com",
  "created": "2023-06-15T09:00:00Z",
  "modified": "2024-01-01T10:30:00Z",
  "password_last_set": "2023-12-01T14:20:00Z",
  "account_expires": null
}
```

#### POST /users
Create a new Active Directory user.

**Request Body:**
```json
{
  "name": "John Doe",
  "samaccountname": "john.doe",
  "password": "StrongPassword123!",
  "enabled": true,
  "ou": "OU=IT,DC=company,DC=com",
  "email": "john.doe@company.com",
  "department": "IT",
  "title": "Software Engineer",
  "given_name": "John",
  "surname": "Doe",
  "phone": "+1-555-0123",
  "manager": "jane.smith"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "status": "success",
  "changes_made": [
    "Created user account",
    "Set initial password",
    "Enabled account"
  ],
  "user": {
    "samaccountname": "john.doe",
    "name": "John Doe",
    "enabled": true,
    "distinguished_name": "CN=John Doe,OU=IT,DC=company,DC=com"
  }
}
```

#### PUT /users/{samaccountname}
Update an existing user.

**Request Body (all fields optional):**
```json
{
  "name": "John A. Doe",
  "email": "john.adoe@company.com",
  "department": "Engineering",
  "title": "Senior Software Engineer",
  "enabled": true
}
```

#### POST /users/{samaccountname}/move
Move user to different Organizational Unit.

**Request Body:**
```json
{
  "target_ou": "OU=Engineering,DC=company,DC=com"
}
```

#### POST /users/{samaccountname}/reset-password
Reset user password.

**Request Body:**
```json
{
  "new_password": "NewPassword123!",
  "force_change_on_logon": true
}
```

#### PUT /users/enable/{samaccountname}
Enable a user account.

#### PUT /users/disable/{samaccountname}
Disable a user account.

#### PUT /users/force-enable/{samaccountname}
Force enable a user (bypasses password policy).

#### PUT /users/bulk-enable
Enable multiple users.

**Request Body:**
```json
["user1", "user2", "user3"]
```

#### DELETE /users/{samaccountname}
Delete a user account.

### Group Management API

#### GET /groups
List all Active Directory groups.

**Response:**
```json
{
  "groups": [
    {
      "Name": "IT Support",
      "SamAccountName": "IT-Support",
      "Description": "IT Support team members",
      "Members": ["john.doe", "jane.smith"],
      "DistinguishedName": "CN=IT Support,OU=Groups,DC=company,DC=com"
    }
  ],
  "count": 1,
  "status": "success"
}
```

#### GET /groups/{samaccountname}
Get specific group details.

#### POST /groups
Create a new group.

**Request Body:**
```json
{
  "name": "DevOps Team",
  "samaccountname": "DevOps-Team",
  "description": "DevOps team members",
  "path": "OU=Groups,DC=company,DC=com"
}
```

#### PUT /groups/{samaccountname}
Update group properties.

#### POST /groups/{samaccountname}/members
Add member to group.

**Request Body:**
```json
{
  "user_samaccountname": "john.doe"
}
```

#### DELETE /groups/{samaccountname}/members/{username}
Remove member from group.

#### GET /groups/{samaccountname}/protection-status
Check if group is protected from accidental deletion.

### Computer Management API

#### GET /computers
List all Active Directory computers.

**Response:**
```json
{
  "computers": [
    {
      "Name": "DESKTOP-ABC123",
      "SamAccountName": "DESKTOP-ABC123$",
      "Description": "John's workstation",
      "Enabled": true,
      "OperatingSystem": "Windows 11 Pro",
      "LastLogonDate": "2024-01-01T08:30:00Z",
      "DistinguishedName": "CN=DESKTOP-ABC123,CN=Computers,DC=company,DC=com"
    }
  ],
  "count": 1,
  "status": "success"
}
```

#### GET /computers/domain/{domain_name}
List computers by domain.

### Organizational Units API

#### GET /ous
List all Organizational Units.

**Response:**
```json
{
  "organizational_units": [
    {
      "Name": "IT Department",
      "DistinguishedName": "OU=IT,DC=company,DC=com",
      "Description": "Information Technology Department"
    }
  ],
  "count": 1,
  "status": "success"
}
```

#### POST /ous
Create new Organizational Unit.

#### GET /ous/{distinguished_name}/protection-status
Check OU protection status.

#### GET /ous/domain-info
Get domain information for OU creation.

### Dashboard API

#### GET /dashboard/stats
Get Active Directory statistics.

**Response:**
```json
{
  "data": {
    "total_users": 150,
    "total_groups": 25,
    "total_computers": 75,
    "total_ous": 12
  },
  "status": "success"
}
```

#### GET /dashboard/health
Dashboard health check.

### Test Connection API

#### GET /test-connection
Test system connectivity and PowerShell availability.

---

## Frontend Components

### Next.js Components

#### Main Layout Component
**File:** `src/components/layout/main-layout.tsx`

Primary application layout with navigation and content areas.

**Props:**
```typescript
interface MainLayoutProps {
  children: React.ReactNode;
}
```

**Usage:**
```tsx
import { MainLayout } from '@/components/layout/main-layout';

export default function Page() {
  return (
    <MainLayout>
      <div>Your page content</div>
    </MainLayout>
  );
}
```

#### Theme Components

##### ThemeProvider
**File:** `src/components/theme-provider.tsx`

Provides theme context for dark/light mode.

**Usage:**
```tsx
import { ThemeProvider } from '@/components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="system" enableSystem>
      <YourApp />
    </ThemeProvider>
  );
}
```

##### ThemeToggle
**File:** `src/components/theme-toggle.tsx`

Button component for switching between themes.

**Usage:**
```tsx
import { ThemeToggle } from '@/components/theme-toggle';

function Header() {
  return (
    <header>
      <ThemeToggle />
    </header>
  );
}
```

#### UI Components

All UI components are built with Tailwind CSS and follow consistent design patterns.

##### Button Component
**File:** `src/components/ui/button.tsx`

**Props:**
```typescript
interface ButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}
```

**Usage:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg" onClick={handleClick}>
  Click Me
</Button>
```

##### Card Component
**File:** `src/components/ui/card.tsx`

**Components:**
- `Card`: Main container
- `CardHeader`: Header section
- `CardTitle`: Title text
- `CardDescription`: Description text
- `CardContent`: Main content area
- `CardFooter`: Footer section

**Usage:**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>User Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>User information goes here</p>
  </CardContent>
</Card>
```

##### Table Component
**File:** `src/components/ui/table.tsx`

**Components:**
- `Table`: Main table container
- `TableHeader`: Header section
- `TableBody`: Body section
- `TableFooter`: Footer section
- `TableRow`: Table row
- `TableHead`: Header cell
- `TableCell`: Data cell

**Usage:**
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

##### Input Component
**File:** `src/components/ui/input.tsx`

**Props:**
```typescript
interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}
```

**Usage:**
```tsx
import { Input } from '@/components/ui/input';

<Input
  type="text"
  placeholder="Enter username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
/>
```

##### Select Component
**File:** `src/components/ui/select.tsx`

**Components:**
- `Select`: Main select container
- `SelectContent`: Dropdown content
- `SelectItem`: Individual option
- `SelectTrigger`: Click trigger
- `SelectValue`: Selected value display

**Usage:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

#### Domain-Specific Components

##### User Components
Located in `src/components/users/`

- **UserList**: Displays paginated list of users with search and filters
- **UserDetail**: Shows detailed user information
- **UserForm**: Form for creating/editing users

##### Group Components
Located in `src/components/groups/`

- **GroupList**: Displays list of groups with member counts
- **GroupDetail**: Shows group details and members
- **GroupForm**: Form for creating/editing groups

##### Computer Components
Located in `src/components/computers/`

- **ComputerList**: Displays list of computers
- **ComputerDetail**: Shows computer information

##### OU Components
Located in `src/components/ous/`

- **OUList**: Displays organizational unit hierarchy
- **OUDetail**: Shows OU details and contained objects

### Angular Components (Legacy Frontend)

Located in `adbot_frontend/src/app/components/`

#### Core Components

- **dashboard**: Main dashboard with statistics
- **user-list**: User management interface
- **user-detail**: Individual user details
- **user-form**: User creation/editing form
- **group-list**: Group management interface
- **group-detail**: Group details and members
- **computer-list**: Computer inventory
- **computer-detail**: Computer information
- **ou-list**: Organizational unit browser
- **header**: Application header with navigation
- **sidebar**: Side navigation menu
- **main-layout**: Main application layout

---

## Client Services

### Base API Service
**File:** `src/lib/api.ts`

Core HTTP client for API communication.

**Methods:**
```typescript
class ApiService {
  async get<T>(endpoint: string): Promise<ApiResponse<T>>
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>>
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>>
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>>
  async delete<T>(endpoint: string): Promise<ApiResponse<T>>
  async testConnection(): Promise<ApiResponse>
}
```

**Usage:**
```typescript
import { apiService } from '@/lib/api';

const response = await apiService.get<User>('/users/john.doe');
if (response.error) {
  console.error(response.error);
} else {
  console.log(response.data);
}
```

### Users Service
**File:** `src/lib/services/users.ts`

Comprehensive user management service.

**Methods:**
```typescript
class UsersService {
  async getUsers(params?: GetUsersParams): Promise<ApiResponse<UsersResponse>>
  async getUser(samAccountName: string): Promise<ApiResponse<User>>
  async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>>
  async updateUser(samAccountName: string, userData: UpdateUserRequest): Promise<ApiResponse<User>>
  async moveUser(samAccountName: string, moveData: MoveUserRequest): Promise<ApiResponse>
  async resetPassword(samAccountName: string, resetData: ResetPasswordRequest): Promise<ApiResponse>
  async deleteUser(samAccountName: string): Promise<ApiResponse>
  async enableUser(samaccountname: string): Promise<ApiResponse>
  async disableUser(samaccountname: string): Promise<ApiResponse>
  async forceEnableUser(samaccountname: string): Promise<ApiResponse>
  async resetAndEnableUser(samaccountname: string, newPassword?: string): Promise<ApiResponse>
  async getUserStatus(samaccountname: string): Promise<ApiResponse>
  async bulkEnableUsers(samaccountnames: string[]): Promise<ApiResponse>
  async bulkDisableUsers(samaccountnames: string[]): Promise<ApiResponse>
  async getOrganizationalUnits(): Promise<ApiResponse<OrganizationalUnitsResponse>>
  async getDefaultUserContainer(): Promise<ApiResponse>
}
```

**Usage:**
```typescript
import { usersService } from '@/lib/services/users';

// Get users with filters
const response = await usersService.getUsers({
  search: 'john',
  enabled: true,
  limit: 50
});

// Create new user
await usersService.createUser({
  name: 'John Doe',
  samaccountname: 'john.doe',
  password: 'SecurePass123!',
  email: 'john.doe@company.com'
});

// Enable user
await usersService.enableUser('john.doe');
```

### Groups Service
**File:** `src/lib/services/groups.ts`

Group management service.

**Methods:**
```typescript
class GroupsService {
  async getGroups(): Promise<ApiResponse<GroupsResponse>>
  async getGroup(samAccountName: string): Promise<ApiResponse<Group>>
  async createGroup(groupData: CreateGroupRequest): Promise<ApiResponse<Group>>
  async updateGroup(samAccountName: string, groupData: UpdateGroupRequest): Promise<ApiResponse<Group>>
  async deleteGroup(samAccountName: string): Promise<ApiResponse>
  async addMember(groupSam: string, memberData: AddMemberRequest): Promise<ApiResponse>
  async removeMember(groupSam: string, username: string): Promise<ApiResponse>
  async getGroupMembers(samAccountName: string): Promise<ApiResponse<GroupMembersResponse>>
}
```

### Computers Service
**File:** `src/lib/services/computers.ts`

Computer management service.

**Methods:**
```typescript
class ComputersService {
  async getComputers(): Promise<ApiResponse<ComputersResponse>>
  async getComputersByDomain(domainName: string): Promise<ApiResponse<ComputersResponse>>
}
```

### OUs Service
**File:** `src/lib/services/ous.ts`

Organizational Units management service.

**Methods:**
```typescript
class OUsService {
  async getOUs(): Promise<ApiResponse<OUsResponse>>
  async createOU(ouData: CreateOURequest): Promise<ApiResponse<OU>>
  async updateOU(distinguishedName: string, ouData: UpdateOURequest): Promise<ApiResponse<OU>>
  async deleteOU(distinguishedName: string): Promise<ApiResponse>
  async getOUProtectionStatus(distinguishedName: string): Promise<ApiResponse>
  async getDomainInfo(): Promise<ApiResponse>
}
```

### Dashboard Service
**File:** `src/lib/services/dashboard.ts`

Dashboard statistics service.

**Methods:**
```typescript
class DashboardService {
  async getStats(): Promise<ApiResponse<DashboardStats>>
}
```

---

## Data Models

### User Models

#### User (Response Model)
```typescript
interface User {
  samaccountname: string;
  name: string;
  enabled: boolean;
  email?: string;
  department?: string;
  title?: string;
  phone?: string;
  manager?: string;
  last_logon_date?: string;
  distinguished_name: string;
  created: string;
  modified: string;
  password_last_set?: string;
  account_expires?: string;
}
```

#### CreateUserRequest
```typescript
interface CreateUserRequest {
  name: string;
  samaccountname: string;
  password: string;
  enabled?: boolean;
  ou?: string;
  email?: string;
  department?: string;
  title?: string;
  given_name?: string;
  surname?: string;
  display_name?: string;
  user_principal_name?: string;
  phone?: string;
  manager?: string;
}
```

#### UpdateUserRequest
```typescript
interface UpdateUserRequest {
  name?: string;
  password?: string;
  enabled?: boolean;
  description?: string;
  email?: string;
  given_name?: string;
  surname?: string;
  display_name?: string;
  user_principal_name?: string;
  department?: string;
  title?: string;
  phone?: string;
  manager?: string;
}
```

### Group Models

#### Group (Response Model)
```typescript
interface Group {
  Name: string;
  SamAccountName: string;
  Description?: string;
  Members?: string[];
  DistinguishedName?: string;
}
```

#### CreateGroupRequest
```typescript
interface CreateGroupRequest {
  name: string;
  samaccountname: string;
  description?: string;
  path?: string;
}
```

### Computer Models

#### Computer (Response Model)
```typescript
interface Computer {
  Name: string;
  SamAccountName: string;
  Description?: string;
  Enabled: boolean;
  OperatingSystem?: string;
  LastLogonDate?: string;
  DistinguishedName: string;
}
```

### OU Models

#### OrganizationalUnit
```typescript
interface OrganizationalUnit {
  Name: string;
  DistinguishedName: string;
  Description?: string;
}
```

### Response Models

#### ApiResponse
```typescript
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}
```

#### PaginatedResponse
```typescript
interface PaginatedResponse<T> {
  data: T[];
  count: number;
  status: string;
}
```

---

## Usage Examples

### Complete User Management Workflow

#### 1. Create a New User
```typescript
import { usersService } from '@/lib/services/users';

async function createNewUser() {
  try {
    // First, get available OUs
    const ousResponse = await usersService.getOrganizationalUnits();
    if (ousResponse.error) {
      throw new Error(ousResponse.error);
    }
    
    // Create user in IT OU
    const userResponse = await usersService.createUser({
      name: 'Jane Smith',
      samaccountname: 'jane.smith',
      password: 'SecurePassword123!',
      email: 'jane.smith@company.com',
      department: 'IT',
      title: 'System Administrator',
      ou: 'OU=IT,DC=company,DC=com',
      enabled: true
    });
    
    if (userResponse.error) {
      throw new Error(userResponse.error);
    }
    
    console.log('User created successfully:', userResponse.data);
  } catch (error) {
    console.error('Failed to create user:', error);
  }
}
```

#### 2. Search and Filter Users
```typescript
async function searchUsers() {
  const response = await usersService.getUsers({
    search: 'smith',
    enabled: true,
    department: 'IT',
    limit: 20
  });
  
  if (response.data) {
    console.log(`Found ${response.data.count} users:`);
    response.data.users.forEach(user => {
      console.log(`- ${user.name} (${user.samaccountname})`);
    });
  }
}
```

#### 3. Bulk Enable Users
```typescript
async function enableMultipleUsers() {
  const usernames = ['john.doe', 'jane.smith', 'bob.wilson'];
  
  const response = await usersService.bulkEnableUsers(usernames);
  if (response.error) {
    console.error('Bulk enable failed:', response.error);
  } else {
    console.log('Users enabled successfully');
  }
}
```

### Group Management Examples

#### 1. Create Group and Add Members
```typescript
import { groupsService } from '@/lib/services/groups';

async function createGroupWithMembers() {
  // Create the group
  const groupResponse = await groupsService.createGroup({
    name: 'DevOps Team',
    samaccountname: 'DevOps-Team',
    description: 'DevOps team members',
    path: 'OU=Groups,DC=company,DC=com'
  });
  
  if (groupResponse.error) {
    throw new Error(groupResponse.error);
  }
  
  // Add members
  const members = ['john.doe', 'jane.smith'];
  for (const member of members) {
    await groupsService.addMember('DevOps-Team', {
      user_samaccountname: member
    });
  }
  
  console.log('Group created and members added');
}
```

### React Component Examples

#### 1. User List Component
```tsx
'use client';

import { useState, useEffect } from 'react';
import { usersService } from '@/lib/services/users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async () => {
    setLoading(true);
    const response = await usersService.getUsers({
      search,
      limit: 50
    });
    
    if (response.data) {
      setUsers(response.data.users);
    }
    setLoading(false);
  };

  const handleEnableUser = async (username: string) => {
    await usersService.enableUser(username);
    loadUsers(); // Refresh list
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={loadUsers}>Refresh</Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.samaccountname}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.samaccountname}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.enabled ? 'Enabled' : 'Disabled'}
              </TableCell>
              <TableCell>
                {!user.enabled && (
                  <Button
                    size="sm"
                    onClick={() => handleEnableUser(user.samaccountname)}
                  >
                    Enable
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### 2. Dashboard Stats Component
```tsx
'use client';

import { useState, useEffect } from 'react';
import { dashboardService } from '@/lib/services/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Users2, Monitor, FolderOpen } from 'lucide-react';

export function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const response = await dashboardService.getStats();
    if (response.data) {
      setStats(response.data.data);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>No data available</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_users}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
          <Users2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_groups}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Computers</CardTitle>
          <Monitor className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_computers}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Organizational Units</CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_ous}</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Error Handling Best Practices

#### 1. Service Layer Error Handling
```typescript
async function handleUserOperation() {
  try {
    const response = await usersService.createUser(userData);
    
    if (response.error) {
      // Handle API errors
      if (response.status === 409) {
        throw new Error('User already exists');
      } else if (response.status === 400) {
        throw new Error('Invalid user data');
      } else {
        throw new Error(response.error);
      }
    }
    
    return response.data;
  } catch (error) {
    // Handle network or other errors
    console.error('User operation failed:', error);
    throw error;
  }
}
```

#### 2. Component Error Handling
```tsx
function UserComponent() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (userData) => {
    setError('');
    setLoading(true);
    
    try {
      await usersService.createUser(userData);
      // Success - redirect or show success message
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {/* Form component */}
    </div>
  );
}
```

This comprehensive documentation covers all public APIs, functions, and components in the ADBot system. Each section includes detailed descriptions, parameters, response formats, and practical usage examples to help developers integrate with and extend the system.