'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authService, UserInfo } from '@/lib/auth';
import { User, LogOut, Shield, Clock } from 'lucide-react';

export function UserInfoComponent() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [authApiAvailable, setAuthApiAvailable] = useState(false);

  useEffect(() => {
    checkAuthAndLoadUser();
  }, []);

  const checkAuthAndLoadUser = async () => {
    const apiAvailable = await authService.checkAuthAPI();
    setAuthApiAvailable(apiAvailable);

    if (apiAvailable && authService.isAuthenticated()) {
      const info = authService.getUserInfo();
      setUserInfo(info);
    }
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload(); // Refresh to show login form
  };

  // Don't show anything if auth API is not available or user is not authenticated
  if (!authApiAvailable || !userInfo) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-gray-700">
          {userInfo.username}
        </span>
      </div>
      
      <Badge variant="outline" className="text-xs">
        {userInfo.auth_method}
      </Badge>
      
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>
          {new Date(userInfo.authenticated_at).toLocaleTimeString()}
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="h-8 px-2"
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
} 