'use client';

import { useState, useEffect } from 'react';
import { Group, CreateGroupRequest, UpdateGroupRequest, OrganizationalUnit } from '@/lib/types';
import { groupsService } from '@/lib/services/groups';
import { usersService } from '@/lib/services/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X, Users } from 'lucide-react';

interface GroupFormProps {
  group?: Group;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSuccess: () => void;
}

export function GroupForm({ group, mode, onClose, onSuccess }: GroupFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([]);
  const [formData, setFormData] = useState<CreateGroupRequest | UpdateGroupRequest>({
    name: group?.Name || '',
    samaccountname: group?.SamAccountName || '',
    description: group?.Description || '',
    path: ''
  });

  useEffect(() => {
    loadOrganizationalUnits();
  }, []);

  const loadOrganizationalUnits = async () => {
    try {
      const response = await usersService.getOrganizationalUnits();
      if (response.data) {
        setOrganizationalUnits(response.data.organizational_units || []);
      }
    } catch (err) {
      console.error('Failed to load OUs:', err);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      setError('Group name is required');
      return false;
    }
    if (!formData.samaccountname?.trim()) {
      setError('SAM Account Name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        const response = await groupsService.createGroup(formData as CreateGroupRequest);
        if (response.error) {
          setError(response.error);
        } else {
          onSuccess();
          onClose();
        }
      } else {
        const updateData: UpdateGroupRequest = {
          name: formData.name,
          description: formData.description
        };
        
        const response = await groupsService.updateGroup(group!.SamAccountName, updateData);
        if (response.error) {
          setError(response.error);
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{mode === 'create' ? 'Create New Group' : 'Edit Group'}</CardTitle>
              <CardDescription>
                {mode === 'create' ? 'Add a new Active Directory group' : 'Update group information'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Sales Team"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="samaccountname">SAM Account Name *</Label>
                <Input
                  id="samaccountname"
                  value={formData.samaccountname}
                  onChange={(e) => handleInputChange('samaccountname', e.target.value)}
                  placeholder="sales-team"
                  required
                  disabled={mode === 'edit'}
                />
              </div>
            </div>

            {/* Organizational Unit (only for create) */}
            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="ou">Organizational Unit</Label>
                <Select
                  value={formData.path || "default"}
                  onValueChange={(value) => handleInputChange('path', value === "default" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select OU (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Container</SelectItem>
                    {organizationalUnits.map((ou) => (
                      <SelectItem key={ou.DistinguishedName} value={ou.DistinguishedName}>
                        {ou.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Group description"
                rows={3}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {mode === 'create' ? 'Create Group' : 'Update Group'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 