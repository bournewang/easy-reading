'use client';

import { createContext, useContext, useEffect, useState } from 'react';
// import { API_URLS } from '@/config/api';
import { api } from '../utils/api';
import { clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from '@/utils/auth-token';

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
  setAuthToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  checkAuth: async () => {},
  setAuthToken: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStoredAuthToken()) {
      setLoading(false);
      return;
    }

    checkAuth();
  }, []);

  const setAuthToken = (token: string | null) => {
    if (token) {
      setStoredAuthToken(token);
      return;
    }

    clearStoredAuthToken();
  };

  const checkAuth = async () => {
    try {
      // console.log('Checking auth at:', API_URLS.me);
      const response = await api.get('/auth/me');

      if (response.status === 200) {
        const userData = response.data;
        console.log('User data:', userData);
        setUser({
          ...userData.user,
          // subscriptionTier: userData.subscriptionTier || 'free',
        });
      } else if (response.status === 401) {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearStoredAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // console.log('Logging out at:', API_URLS.logout);
      const response = await api.post('/auth/logout');
      console.log('Logout response:', response);
      if (response.status === 200) {
        // Clear user state immediately
        clearStoredAuthToken();
        setUser(null);
        // Force a new auth check to ensure we're logged out
        await checkAuth();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if the logout request fails, clear the user state
      clearStoredAuthToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth, setAuthToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 
