'use client';

import { useState } from 'react';
import { Group } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Edit, Trash2, Users2, UserPlus, UserMinus, Move } from 'lucide-react';

interface GroupDetailsProps {
  group: Group;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  onAddMember: (username: string) => void;
  onRemoveMember: (username: string) => void;
}

export function GroupDetails({ 
  group, 
  onClose, 
  onEdit, 
  onDelete, 
  onMove,
  onAddMember, 
  onRemoveMember 
}: GroupDetailsProps) {
  const [newMember, setNewMember] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const handleAddMember = async () => {
    if (!newMember.trim()) return;
    
    setAddingMember(true);
    try {
      await onAddMember(newMember.trim());
      setNewMember('');
    } finally {
      setAddingMember(false);
    }
  };

  const getParentPath = (distinguishedName?: string) => {
    if (!distinguishedName) return 'Unknown';
    const parts = distinguishedName.split(',');
    if (parts.length > 1) {
      parts.shift(); // Remove the first part (current group)
      return parts.join(', ');
    }
    return 'Root';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{group.Name}</CardTitle>
                <CardDescription>
                  SAM Account: {group.SamAccountName}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {group.Members && Array.isArray(group.Members) ? group.Members.length : 0} members
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users2 className="h-4 w-4" />
                  Group Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Group Name:</span>
                  <span className="text-sm font-medium">{group.Name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">SAM Account:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {group.SamAccountName}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Description:</span>
                  <span className="text-sm font-medium">{group.Description || 'No description'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Location:</span>
                  <span className="text-sm font-medium">{getParentPath(group.DistinguishedName)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Member Management</CardTitle>
                <CardDescription>
                  Add or remove group members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="new-member" className="sr-only">Add Member</Label>
                    <Input
                      id="new-member"
                      placeholder="Enter username"
                      value={newMember}
                      onChange={(e) => setNewMember(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleAddMember}
                    disabled={addingMember || !newMember.trim()}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Group Members */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Group Members</CardTitle>
              <CardDescription>
                Current members of this group
              </CardDescription>
            </CardHeader>
            <CardContent>
              {group.Members && Array.isArray(group.Members) && group.Members.length > 0 ? (
                <div className="space-y-2">
                  {group.Members.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium">{member}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMember(member)}
                      >
                        <UserMinus className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No members in this group</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" onClick={onMove}>
              <Move className="h-4 w-4 mr-2" />
              Move Group
            </Button>
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Group
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Group
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 