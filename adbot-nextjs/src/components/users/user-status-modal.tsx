'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, RefreshCw, Shield, Clock, Key } from 'lucide-react';
import { usersService } from '@/lib/services/users';

interface UserStatusModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export function UserStatusModal({ username, isOpen, onClose, onUserUpdated }: UserStatusModalProps) {
  const [userStatus, setUserStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUserStatus = async () => {
    if (!username) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await usersService.getUserStatus(username);
      if (response.error) {
        setError(response.error);
      } else {
        setUserStatus(response.data?.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && username) {
      fetchUserStatus();
    }
  }, [isOpen, username]);

  const handleEnableUser = async (forceEnable = false) => {
    setActionLoading(true);
    setError('');
    
    try {
      const response = forceEnable 
        ? await usersService.forceEnableUser(username)
        : await usersService.enableUser(username);
      
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        await fetchUserStatus(); // Refresh status
        onUserUpdated?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableUser = async () => {
    setActionLoading(true);
    setError('');
    
    try {
      const response = await usersService.disableUser(username);
      
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        await fetchUserStatus(); // Refresh status
        onUserUpdated?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable user');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Status: {username}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUserStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading user status...</span>
            </div>
          ) : userStatus ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-lg font-semibold">{userStatus.Name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Username</label>
                  <p className="text-lg font-mono">{userStatus.SamAccountName}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={userStatus.Enabled ? "default" : "secondary"}>
                  {userStatus.Enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Badge variant={userStatus.LockedOut ? "destructive" : "outline"}>
                  {userStatus.LockedOut ? "Locked Out" : "Not Locked"}
                </Badge>
                <Badge variant={userStatus.PasswordExpired ? "destructive" : "outline"}>
                  {userStatus.PasswordExpired ? "Password Expired" : "Password Valid"}
                </Badge>
              </div>

              {/* Detailed Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <label className="text-sm font-medium">Last Logon</label>
                  </div>
                  <p className="text-sm">{userStatus.LastLogonDate || 'Never'}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <label className="text-sm font-medium">Account Created</label>
                  </div>
                  <p className="text-sm">{userStatus.WhenCreated}</p>
                </div>

                {userStatus.AccountExpirationDate && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Account Expires</label>
                    <p className="text-sm">{userStatus.AccountExpirationDate}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {userStatus.Enabled ? (
                  <Button 
                    variant="outline" 
                    onClick={() => handleDisableUser()}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Disable User
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="default" 
                      onClick={() => handleEnableUser(false)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Enable User
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleEnableUser(true)}
                      disabled={actionLoading}
                    >
                      Force Enable
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-gray-500">No user status data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 