'use client';

import { useState, useEffect } from 'react';
import { User, CreateUserRequest, UpdateUserRequest, OrganizationalUnit } from '@/lib/types';
import { usersService } from '@/lib/services/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X } from 'lucide-react';

interface UserFormProps {
  user?: User;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSuccess: () => void;
}

export function UserForm({ user, mode, onClose, onSuccess }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([]);
  const [formData, setFormData] = useState<CreateUserRequest | UpdateUserRequest>({
    name: user?.Name || '',
    samaccountname: user?.SamAccountName || '',
    password: '',
    enabled: user?.Enabled ?? true,
    description: user?.Description || '',
    email: user?.EmailAddress || '',
    given_name: user?.GivenName || '',
    surname: user?.Surname || '',
    display_name: user?.DisplayName || '',
    user_principal_name: user?.UserPrincipalName || '',
    ou: ''
  });

  useEffect(() => {
    loadOrganizationalUnits();
  }, []);

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.Name || '',
        samaccountname: user.SamAccountName || '',
        password: '',
        enabled: user.Enabled ?? true,
        description: user.Description || '',
        email: user.EmailAddress || '',
        given_name: user.GivenName || '',
        surname: user.Surname || '',
        display_name: user.DisplayName || '',
        user_principal_name: user.UserPrincipalName || '',
        ou: ''
      });
      console.log('Form data updated with user:', user);
      console.log('User enabled status:', user.Enabled);
    }
  }, [user]);

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
    console.log(`Field: ${field}, Value:`, value, `Type:`, typeof value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.samaccountname?.trim()) {
      setError('SAM Account Name is required');
      return false;
    }
    if (mode === 'create' && !formData.password?.trim()) {
      setError('Password is required');
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
        const response = await usersService.createUser(formData as CreateUserRequest);
        if (response.error) {
          setError(response.error);
        } else {
          onSuccess();
          onClose();
        }
      } else {
        const updateData: UpdateUserRequest = {
          name: formData.name,
          description: formData.description,
          email: formData.email,
          given_name: formData.given_name,
          surname: formData.surname,
          display_name: formData.display_name,
          user_principal_name: formData.user_principal_name,
          enabled: formData.enabled
        };
        
        console.log('Sending update data:', updateData);
        console.log('Current user enabled status:', user?.Enabled);
        console.log('New enabled status:', formData.enabled);
        
        const response = await usersService.updateUser(user!.SamAccountName, updateData);
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
              <CardTitle>{mode === 'create' ? 'Create New User' : 'Edit User'}</CardTitle>
              <CardDescription>
                {mode === 'create' ? 'Add a new Active Directory user' : 'Update user information'}
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
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="samaccountname">SAM Account Name *</Label>
                <Input
                  id="samaccountname"
                  value={formData.samaccountname}
                  onChange={(e) => handleInputChange('samaccountname', e.target.value)}
                  placeholder="jdoe"
                  required
                  disabled={mode === 'edit'}
                />
              </div>
            </div>

            {/* Password (only for create) */}
            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
            )}

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="given_name">Given Name</Label>
                <Input
                  id="given_name"
                  value={formData.given_name}
                  onChange={(e) => handleInputChange('given_name', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => handleInputChange('surname', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john.doe@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_principal_name">User Principal Name</Label>
              <Input
                id="user_principal_name"
                value={formData.user_principal_name}
                onChange={(e) => handleInputChange('user_principal_name', e.target.value)}
                placeholder="john.doe@company.com"
              />
            </div>

            {/* Organizational Unit (only for create) */}
            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="ou">Organizational Unit</Label>
                <Select
                  value={formData.ou || "default"}
                  onValueChange={(value) => handleInputChange('ou', value === "default" ? "" : value)}
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
                placeholder="User description"
                rows={3}
              />
            </div>

            {/* Account Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => handleInputChange('enabled', checked === true)}
              />
              <Label htmlFor="enabled">Account Enabled</Label>
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
                    {mode === 'create' ? 'Create User' : 'Update User'}
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