'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/lib/auth';
import { LoginForm } from './login-form';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authApiAvailable, setAuthApiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    setIsCheckingAuth(true);

    // First check if auth API is available
    const apiAvailable = await authService.checkAuthAPI();
    setAuthApiAvailable(apiAvailable);

    if (!apiAvailable) {
      // If auth API is not available, allow access without authentication
      console.log('Auth API not available, allowing access without authentication');
      setIsAuthenticated(true);
      setIsCheckingAuth(false);
      return;
    }

    // Check if user is already authenticated
    const authenticated = authService.isAuthenticated();
    
    if (authenticated) {
      // Verify token with server
      const verified = await authService.verifyToken();
      setIsAuthenticated(verified);
    } else {
      setIsAuthenticated(false);
    }

    setIsCheckingAuth(false);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated and auth API is available
  if (authApiAvailable && !isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main app if authenticated or auth API is not available
  return <>{children}</>;
} 