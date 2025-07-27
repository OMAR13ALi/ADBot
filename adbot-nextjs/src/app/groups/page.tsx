'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { groupsService } from '@/lib/services/groups';
import { Group } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Plus, RefreshCw, Eye, Edit, Trash2, Users2 } from 'lucide-react';
import { GroupForm } from '@/components/groups/group-form';
import { GroupDetails } from '@/components/groups/group-details';
import { MoveModal } from '@/components/shared/move-modal';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadGroups = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load groups and member counts in parallel
      const [groupsResponse, memberCountsResponse] = await Promise.all([
        groupsService.getGroups(),
        groupsService.getMemberCounts()
      ]);
      
      if (groupsResponse.error) {
        setError(groupsResponse.error);
      } else {
        setGroups(groupsResponse.data?.groups || []);
      }
      
      if (memberCountsResponse.error) {
        console.warn('Failed to load member counts:', memberCountsResponse.error);
      } else {
        setMemberCounts(memberCountsResponse.data?.member_counts || {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleSearch = () => {
    // For now, we'll do client-side filtering
    // In the future, we can add server-side search
    loadGroups();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    loadGroups();
  };

  const handleCreateGroup = () => {
    setShowCreateForm(true);
  };

  const handleViewGroup = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group);
    setShowEditForm(true);
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Are you sure you want to delete group "${group.Name}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await groupsService.deleteGroup(group.SamAccountName);
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        loadGroups(); // Refresh the list
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async (username: string) => {
    if (!selectedGroup) return;

    setActionLoading(true);
    try {
      const response = await groupsService.addMember(selectedGroup.SamAccountName, { user_samaccountname: username });
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        // Refresh the group details
        const updatedGroup = await groupsService.getGroup(selectedGroup.SamAccountName);
        if (updatedGroup.data) {
          setSelectedGroup(updatedGroup.data.group);
        }
        // Refresh member counts for the table
        const memberCountsResponse = await groupsService.getMemberCounts();
        if (memberCountsResponse.data) {
          setMemberCounts(memberCountsResponse.data.member_counts);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (username: string) => {
    if (!selectedGroup) return;

    setActionLoading(true);
    try {
      const response = await groupsService.removeMember(selectedGroup.SamAccountName, username);
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        // Refresh the group details
        const updatedGroup = await groupsService.getGroup(selectedGroup.SamAccountName);
        if (updatedGroup.data) {
          setSelectedGroup(updatedGroup.data.group);
        }
        // Refresh member counts for the table
        const memberCountsResponse = await groupsService.getMemberCounts();
        if (memberCountsResponse.data) {
          setMemberCounts(memberCountsResponse.data.member_counts);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadGroups(); // Refresh the list and member counts after successful operation
  };

  const handleMoveGroup = async (targetOU: string) => {
    if (!selectedGroup) return;
    
    setActionLoading(true);
    try {
      const response = await groupsService.moveGroup(selectedGroup.SamAccountName, { target_ou: targetOU });
      if (response.error) {
        throw new Error(response.error);
      }
      setError('');
      loadGroups(); // Refresh the list
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Filter groups based on search term
  const filteredGroups = groups.filter(group =>
    group.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.SamAccountName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Group Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage Active Directory groups and their members
              </p>
            </div>
            <Button onClick={handleCreateGroup} disabled={actionLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Search and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Groups</CardTitle>
            <CardDescription>
              Search for groups by name or SAM account name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search groups..."
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

        {/* Groups Table */}
        <Card>
          <CardHeader>
            <CardTitle>Groups ({filteredGroups.length})</CardTitle>
            <CardDescription>
              Active Directory groups in your domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading groups...</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No groups found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SAM Account</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <TableRow key={group.SamAccountName}>
                      <TableCell className="font-medium">
                        {group.Name}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm text-foreground">
                          {group.SamAccountName}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {memberCounts[group.SamAccountName] || 0} members
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {group.Description || "No description"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewGroup(group)}
                            disabled={actionLoading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditGroup(group)}
                            disabled={actionLoading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteGroup(group)}
                            disabled={actionLoading}
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
        <GroupForm
          mode="create"
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showEditForm && selectedGroup && (
        <GroupForm
          group={selectedGroup}
          mode="edit"
          onClose={() => {
            setShowEditForm(false);
            setSelectedGroup(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showGroupDetails && selectedGroup && (
        <GroupDetails
          group={selectedGroup}
          onClose={() => {
            setShowGroupDetails(false);
            setSelectedGroup(null);
          }}
          onEdit={() => {
            setShowGroupDetails(false);
            setShowEditForm(true);
          }}
          onMove={() => {
            setShowGroupDetails(false);
            setShowMoveModal(true);
          }}
          onDelete={() => {
            setShowGroupDetails(false);
            setSelectedGroup(null);
            handleDeleteGroup(selectedGroup);
          }}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {showMoveModal && selectedGroup && (
        <MoveModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setSelectedGroup(null);
          }}
          onMove={handleMoveGroup}
          title="Move Group"
          description={`Move group "${selectedGroup.Name}" to a different organizational unit`}
          currentLocation={selectedGroup.DistinguishedName}
          getOrganizationalUnits={groupsService.getOrganizationalUnits}
        />
      )}
    </MainLayout>
  );
} 