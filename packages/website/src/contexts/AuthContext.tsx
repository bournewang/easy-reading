'use client';

import { createContext, useContext, useEffect, useState } from 'react';
// import { API_URLS } from '@/config/api';
import { api } from '../utils/api';
import { clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from '@/utils/auth-token';
import { getSubscriptionEntitlements, type SubscriptionEntitlements } from '@/lib/api/subscription';

const ENTITLEMENTS_STORAGE_KEY = 'easy_reading_entitlements';

interface User {
  id: string;
  username: string;
  fullName?: string;
  referralCode?: string;
  subscriptionTier?: string;
  subscriptionExpires?: string;
}

interface AuthContextType {
  user: User | null;
  entitlements: SubscriptionEntitlements | null;
  loading: boolean;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setAuthToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  entitlements: null,
  loading: true,
  logout: async () => {},
  checkAuth: async () => {},
  setAuthToken: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [entitlements, setEntitlements] = useState<SubscriptionEntitlements | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(ENTITLEMENTS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SubscriptionEntitlements;
    } catch {
      return null;
    }
  });
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
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ENTITLEMENTS_STORAGE_KEY);
    }
  };

  const persistEntitlements = (value: SubscriptionEntitlements | null) => {
    setEntitlements(value);
    if (typeof window === 'undefined') {
      return;
    }

    if (!value) {
      window.localStorage.removeItem(ENTITLEMENTS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ENTITLEMENTS_STORAGE_KEY, JSON.stringify(value));
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
        try {
          const nextEntitlements = await getSubscriptionEntitlements();
          persistEntitlements(nextEntitlements);
        } catch (entitlementError) {
          console.error('Entitlements fetch failed:', entitlementError);
          persistEntitlements(null);
        }
      } else if (response.status === 401) {
        setUser(null);
        persistEntitlements(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearStoredAuthToken();
      setUser(null);
      persistEntitlements(null);
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
        persistEntitlements(null);
        // Force a new auth check to ensure we're logged out
        await checkAuth();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if the logout request fails, clear the user state
      clearStoredAuthToken();
      setUser(null);
      persistEntitlements(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, entitlements, loading, logout, checkAuth, setAuthToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 
