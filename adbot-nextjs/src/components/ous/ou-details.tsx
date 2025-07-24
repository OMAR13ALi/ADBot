'use client';

import { OrganizationalUnit } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Edit, Trash2, FolderOpen } from 'lucide-react';

interface OUDetailsProps {
  ou: OrganizationalUnit;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function OUDetails({ ou, onClose, onEdit, onDelete }: OUDetailsProps) {
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{ou.Name}</CardTitle>
                <CardDescription>
                  Organizational Unit Details
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                OU
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                OU Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">OU Name:</span>
                <span className="text-sm font-medium">{ou.Name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Description:</span>
                <span className="text-sm font-medium">{ou.Description || 'No description'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Location:</span>
                <span className="text-sm font-medium">{getParentPath(ou.DistinguishedName)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Distinguished Name:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
                  {ou.DistinguishedName}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit OU
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete OU
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 