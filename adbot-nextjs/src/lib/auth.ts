// Authentication service for ADBot Next.js frontend
import { apiService } from './api';

export interface AuthCredentials {
  username: string;
  password: string;
  server_ip: string;
}

export interface UserInfo {
  username: string;
  server_ip: string;
  auth_method: string;
  authenticated_at: string;
  system_info?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_info: UserInfo;
}

class AuthService {
  private readonly AUTH_API_BASE = 'http://localhost:8001';
  private readonly TOKEN_KEY = 'adbot_token';
  private readonly USER_INFO_KEY = 'adbot_user_info';
  private readonly TOKEN_EXPIRY_KEY = 'adbot_token_expiry';

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return false;
    
    // Check if token is expired
    const now = new Date().getTime();
    const expiryTime = parseInt(expiry);
    
    if (now > expiryTime) {
      this.logout();
      return false;
    }
    
    return true;
  }

  // Get stored token
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Get stored user info
  getUserInfo(): UserInfo | null {
    if (typeof window === 'undefined') return null;
    
    const userInfoStr = localStorage.getItem(this.USER_INFO_KEY);
    if (!userInfoStr) return null;
    
    try {
      return JSON.parse(userInfoStr);
    } catch {
      return null;
    }
  }

  // Login with credentials
  async login(credentials: AuthCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.AUTH_API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        const expiryTime = new Date().getTime() + (data.expires_in * 1000);
        
        localStorage.setItem(this.TOKEN_KEY, data.access_token);
        localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(data.user_info));
        localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
        
        return { success: true };
      } else {
        return { success: false, error: data.detail || 'Login failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  // Logout
  logout(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_INFO_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  // Verify token with auth API
  async verifyToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${this.AUTH_API_BASE}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  // Check if auth API is available
  async checkAuthAPI(): Promise<boolean> {
    try {
      const response = await fetch(`${this.AUTH_API_BASE}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService(); 