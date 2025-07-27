'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { usersService } from '@/lib/services/users';
import { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Plus, RefreshCw, Eye, Edit, Trash2, Shield } from 'lucide-react';
import { UserForm } from '@/components/users/user-form';
import { UserDetails } from '@/components/users/user-details';
import { UserStatusModal } from '@/components/users/user-status-modal';
import { MoveModal } from '@/components/shared/move-modal';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await usersService.getUsers({
        search: searchTerm || undefined,
        limit: 100
      });
      
      if (response.error) {
        setError(response.error);
      } else {
        setUsers(response.data?.users || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSearch = () => {
    loadUsers();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    loadUsers();
  };

  const handleCreateUser = () => {
    setShowCreateForm(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditForm(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.Name}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await usersService.deleteUser(user.SamAccountName);
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        loadUsers(); // Refresh the list
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadUsers(); // Refresh the list after successful operation
  };

  const handleMoveUser = async (targetOU: string) => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const response = await usersService.moveUser(selectedUser.SamAccountName, { target_ou: targetOU });
      if (response.error) {
        throw new Error(response.error);
      }
      setError('');
      loadUsers(); // Refresh the list
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">User Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage Active Directory users
              </p>
            </div>
            <Button onClick={handleCreateUser} disabled={actionLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Search and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
            <CardDescription>
              Search for users by name or SAM account name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">
                <strong>Error:</strong> {error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
            <CardDescription>
              Active Directory users in your domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SAM Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.SamAccountName}>
                      <TableCell className="font-medium">
                        {user.Name}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm text-foreground">
                          {user.SamAccountName}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.Enabled ? "default" : "secondary"}>
                            {user.Enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          {user.Enabled ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  setActionLoading(true);
                                  const response = await usersService.disableUser(user.SamAccountName);
                                  
                                  if (response.error) {
                                    setError(response.error);
                                  } else {
                                    setError('');
                                    loadUsers(); // Refresh the list
                                  }
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to disable user');
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                              disabled={actionLoading}
                            >
                              Disable
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setActionLoading(true);
                                    // Try standard enable first
                                    let response = await usersService.enableUser(user.SamAccountName);
                                    
                                    // If standard enable fails due to password policy, try force enable
                                    if (response.error && response.error.includes && response.error.includes('password')) {
                                      response = await usersService.forceEnableUser(user.SamAccountName);
                                    }
                                    
                                    if (response.error) {
                                      setError(response.error);
                                    } else {
                                      setError('');
                                      loadUsers(); // Refresh the list
                                    }
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Failed to enable user');
                                  } finally {
                                    setActionLoading(false);
                                  }
                                }}
                                disabled={actionLoading}
                                title="Enable user account"
                              >
                                Enable
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setActionLoading(true);
                                    const response = await usersService.forceEnableUser(user.SamAccountName);
                                    
                                    if (response.error) {
                                      setError(response.error);
                                    } else {
                                      setError('');
                                      loadUsers(); // Refresh the list
                                    }
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Failed to force enable user');
                                  } finally {
                                    setActionLoading(false);
                                  }
                                }}
                                disabled={actionLoading}
                                title="Force enable (bypasses password policy)"
                              >
                                Force
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.Description || "No description"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewUser(user)}
                            disabled={actionLoading}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowStatusModal(true);
                            }}
                            disabled={actionLoading}
                            title="View Status"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            disabled={actionLoading}
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            disabled={actionLoading}
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {showCreateForm && (
        <UserForm
          mode="create"
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showEditForm && selectedUser && (
        <UserForm
          user={selectedUser}
          mode="edit"
          onClose={() => {
            setShowEditForm(false);
            setSelectedUser(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showUserDetails && selectedUser && (
        <UserDetails
          user={selectedUser}
          onClose={() => {
            setShowUserDetails(false);
            setSelectedUser(null);
          }}
          onEdit={() => {
            setShowUserDetails(false);
            setShowEditForm(true);
          }}
          onMove={() => {
            setShowUserDetails(false);
            setShowMoveModal(true);
          }}
          onDelete={() => {
            setShowUserDetails(false);
            setSelectedUser(null);
            handleDeleteUser(selectedUser);
          }}
        />
      )}

      {showStatusModal && selectedUser && (
        <UserStatusModal
          username={selectedUser.SamAccountName}
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedUser(null);
          }}
          onUserUpdated={loadUsers}
        />
      )}

      {showMoveModal && selectedUser && (
        <MoveModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setSelectedUser(null);
          }}
          onMove={handleMoveUser}
          title="Move User"
          description={`Move user "${selectedUser.Name}" to a different organizational unit`}
          currentLocation={selectedUser.DistinguishedName}
          getOrganizationalUnits={usersService.getOrganizationalUnits}
        />
      )}
    </MainLayout>
  );
} 