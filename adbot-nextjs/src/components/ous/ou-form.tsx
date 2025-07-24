'use client';

import { useState, useEffect } from 'react';
import { OrganizationalUnit, CreateOURequest, UpdateOURequest } from '@/lib/types';
import { ousService } from '@/lib/services/ous';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, Loader2 } from 'lucide-react';

interface OUFormProps {
  ou?: OrganizationalUnit;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSuccess: () => void;
}

export function OUForm({ ou, mode, onClose, onSuccess }: OUFormProps) {
  const [formData, setFormData] = useState<CreateOURequest>({
    name: ou?.Name || '',
    path: '',
    description: ou?.Description || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableOUs, setAvailableOUs] = useState<OrganizationalUnit[]>([]);
  const [domainInfo, setDomainInfo] = useState<{ DomainDN: string; DomainName: string; NetBIOSName: string } | null>(null);

  useEffect(() => {
    loadAvailableOUs();
    loadDomainInfo();
  }, []);

  const loadAvailableOUs = async () => {
    try {
      const response = await ousService.getOUs();
      if (response.data) {
        setAvailableOUs(response.data.ous);
      }
    } catch (err) {
      console.error('Failed to load OUs:', err);
    }
  };

  const loadDomainInfo = async () => {
    try {
      const response = await ousService.getDomainInfo();
      if (response.data) {
        setDomainInfo(response.data.domain_info);
      }
    } catch (err) {
      console.error('Failed to load domain info:', err);
    }
  };

  const handleInputChange = (field: keyof CreateOURequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.path.trim()) {
      setError('Parent OU path is required');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (mode === 'create') {
        const response = await ousService.createOU(formData);
        if (response.error) {
          setError(response.error);
        } else {
          onSuccess();
          onClose();
        }
      } else {
        if (!ou?.DistinguishedName) {
          setError('OU Distinguished Name is required for editing');
          return;
        }
        const updateData: UpdateOURequest = {
          name: formData.name,
          description: formData.description
        };
        const response = await ousService.updateOU(ou.DistinguishedName, updateData);
        if (response.error) {
          setError(response.error);
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save OU');
    } finally {
      setLoading(false);
    }
  };

  const getParentPath = (distinguishedName?: string) => {
    if (!distinguishedName) return 'Unknown';
    const parts = distinguishedName.split(',');
    if (parts.length > 1) {
      parts.shift(); // Remove the first part (current OU)
      return parts.join(', ');
    }
    return 'Root';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {mode === 'create' ? 'Create New OU' : 'Edit OU'}
              </CardTitle>
              <CardDescription>
                {mode === 'create' ? 'Create a new organizational unit' : 'Update organizational unit details'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">OU Name *</Label>
              <Input
                id="name"
                placeholder="Enter OU name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            {mode === 'create' && (
              <div>
                <Label htmlFor="path">Parent OU Path *</Label>
                <Select
                  value={formData.path}
                  onValueChange={(value) => handleInputChange('path', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent OU" />
                  </SelectTrigger>
                  <SelectContent>
                    {domainInfo && (
                      <SelectItem value={domainInfo.DomainDN}>
                        Root Domain ({domainInfo.DomainName})
                      </SelectItem>
                    )}
                    {availableOUs.map((availableOU) => (
                      <SelectItem key={availableOU.DistinguishedName} value={availableOU.DistinguishedName}>
                        {availableOU.Name} ({getParentPath(availableOU.DistinguishedName)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter OU description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Create OU' : 'Update OU'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 