'use client';

import { Computer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Monitor, Calendar, MapPin, Info } from 'lucide-react';

interface ComputerDetailsProps {
  computer: Computer;
  onClose: () => void;
}

export function ComputerDetails({ computer, onClose }: ComputerDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === 'Never') return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getParentPath = (distinguishedName?: string) => {
    if (!distinguishedName) return 'Unknown';
    const parts = distinguishedName.split(',');
    if (parts.length > 1) {
      parts.shift(); // Remove the first part (current computer)
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
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Monitor className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{computer.Name}</CardTitle>
                <CardDescription>
                  SAM Account: {computer.SamAccountName}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={computer.Enabled ? "default" : "secondary"}>
                {computer.Enabled ? "Enabled" : "Disabled"}
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
                  <Monitor className="h-4 w-4" />
                  Computer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Computer Name:</span>
                  <span className="text-sm font-medium">{computer.Name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">SAM Account:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {computer.SamAccountName}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge variant={computer.Enabled ? "default" : "secondary"} className="text-xs">
                    {computer.Enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Description:</span>
                  <span className="text-sm font-medium">{computer.Description || 'No description'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Operating System:</span>
                  <span className="text-sm font-medium">{computer.OperatingSystem || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Logon:</span>
                  <span className="text-sm font-medium">{formatDate(computer.LastLogonDate)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Location:</span>
                  <span className="text-sm font-medium">{getParentPath(computer.DistinguishedName)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Distinguished Name:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
                    {computer.DistinguishedName || 'Unknown'}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 