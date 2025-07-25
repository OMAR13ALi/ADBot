'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Move, X } from 'lucide-react';
import { OrganizationalUnit } from '@/lib/types';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetOU: string) => Promise<void>;
  title: string;
  description: string;
  currentLocation?: string;
  getOrganizationalUnits: () => Promise<{ data?: { organizational_units: OrganizationalUnit[] } }>;
}

export function MoveModal({
  isOpen,
  onClose,
  onMove,
  title,
  description,
  currentLocation,
  getOrganizationalUnits
}: MoveModalProps) {
  const [selectedOU, setSelectedOU] = useState<string>('');
  const [availableOUs, setAvailableOUs] = useState<OrganizationalUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadOrganizationalUnits();
    }
  }, [isOpen]);

  const loadOrganizationalUnits = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getOrganizationalUnits();
      if (response.data) {
        setAvailableOUs(response.data.organizational_units);
      }
    } catch (err) {
      setError('Failed to load organizational units');
      console.error('Error loading OUs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!selectedOU) {
      setError('Please select a target organizational unit');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onMove(selectedOU);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move item');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Move className="h-5 w-5 text-blue-600" />
              <CardTitle>{title}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentLocation && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Location</Label>
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {currentLocation}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="target-ou" className="text-sm font-medium">
              Target Organizational Unit
            </Label>
            <Select value={selectedOU} onValueChange={setSelectedOU}>
              <SelectTrigger id="target-ou">
                <SelectValue placeholder="Select target OU" />
              </SelectTrigger>
              <SelectContent>
                {availableOUs.map((ou) => (
                  <SelectItem key={ou.DistinguishedName} value={ou.DistinguishedName}>
                    {ou.Name} ({getParentPath(ou.DistinguishedName)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={loading || !selectedOU}>
              {loading ? 'Moving...' : 'Move'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get parent path from distinguished name
function getParentPath(distinguishedName: string): string {
  const parts = distinguishedName.split(',');
  if (parts.length <= 2) return 'Root Domain';
  
  // Remove the first part (the object itself) and join the rest
  const parentParts = parts.slice(1);
  return parentParts.join(',');
} 