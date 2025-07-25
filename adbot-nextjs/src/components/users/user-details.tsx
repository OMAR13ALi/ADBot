'use client';

import { useState } from 'react';
import { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Edit, Trash2, User as UserIcon, Mail, Calendar, Shield, Move } from 'lucide-react';

interface UserDetailsProps {
  user: User;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
}

export function UserDetails({ user, onClose, onEdit, onDelete, onMove }: UserDetailsProps) {
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
      parts.shift(); // Remove the first part (current user)
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
                <UserIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{user.Name}</CardTitle>
                <CardDescription>
                  SAM Account: {user.SamAccountName}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={user.Enabled ? "default" : "secondary"}>
                {user.Enabled ? "Enabled" : "Disabled"}
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
                  <UserIcon className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Full Name:</span>
                  <span className="text-sm font-medium">{user.Name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">SAM Account:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {user.SamAccountName}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Display Name:</span>
                  <span className="text-sm font-medium">{user.DisplayName || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Given Name:</span>
                  <span className="text-sm font-medium">{user.GivenName || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Surname:</span>
                  <span className="text-sm font-medium">{user.Surname || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Description:</span>
                  <span className="text-sm font-medium">{user.Description || 'No description'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Email Address:</span>
                  <span className="text-sm font-medium">{user.EmailAddress || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">User Principal Name:</span>
                  <span className="text-sm font-medium">{user.UserPrincipalName || 'Not set'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Account Status:</span>
                    <Badge variant={user.Enabled ? "default" : "secondary"}>
                      {user.Enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="text-sm font-medium">{getParentPath(user.DistinguishedName)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Password Last Set:</span>
                    <span className="text-sm font-medium">{formatDate(user.PasswordLastSet)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Logon:</span>
                    <span className="text-sm font-medium">{formatDate(user.LastLogon)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Account Created:</span>
                    <span className="text-sm font-medium">{formatDate(user.Created)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Modified:</span>
                    <span className="text-sm font-medium">{formatDate(user.Modified)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Group Memberships */}
          {user.MemberOf && user.MemberOf.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Group Memberships</CardTitle>
                <CardDescription>
                  Groups this user is a member of
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.MemberOf.map((group, index) => (
                    <Badge key={index} variant="outline">
                      {group}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" onClick={onMove}>
              <Move className="h-4 w-4 mr-2" />
              Move User
            </Button>
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit User
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 