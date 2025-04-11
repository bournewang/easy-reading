'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { API_URLS } from '@/config/api';

interface User {
  id: string;
  username: string;
  fullName?: string;
  subscriptionTier?: string;
  subscriptionExpires?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Checking auth at:', API_URLS.me);
      const response = await fetch(API_URLS.me, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          ...data.user,
          subscriptionTier: data.user.subscriptionTier || 'free',
          subscriptionExpires: data.user.subscriptionExpires
        });
      } else if (response.status === 401) {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out at:', API_URLS.logout);
      const response = await fetch(API_URLS.logout, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Clear user state immediately
        setUser(null);
        // Force a new auth check to ensure we're logged out
        await checkAuth();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if the logout request fails, clear the user state
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 