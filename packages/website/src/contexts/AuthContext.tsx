'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { clearStoredReaderWarning } from '@easy-reading/shared';
// import { API_URLS } from '@/config/api';
import { api } from '../utils/api';
import { clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from '@/utils/auth-token';
import { getSubscriptionEntitlements, type SubscriptionEntitlements } from '@/lib/api/subscription';
import { fetchAnonymousLimits } from '@/utils/anonymous-limits';
import { clearLocalReadingHistory, getReadingHistory, invalidateReadingHistoryCache, syncReadingHistoryAsync } from '@/utils/reading-history';

const ENTITLEMENTS_STORAGE_KEY = 'easy_reading_entitlements';
const WORDBOOK_STORAGE_KEY = 'english_reader_wordlist';
const AUTH_CHANGED_EVENT = 'easy-reading-auth-changed';

interface User {
  id: number;
  username: string;
  email?: string | null;
  fullName?: string;
  referralCode?: string;
  hasReferrer?: boolean;
  isAdmin?: boolean;
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

function emitAuthChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function getLocalWordbookWords() {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(WORDBOOK_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed
          .map((word) => (typeof word === 'string' ? word.trim().toLowerCase() : ''))
          .filter(Boolean),
      ),
    );
  } catch {
    return [];
  }
}

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
    void fetchAnonymousLimits();

    if (!getStoredAuthToken()) {
      setLoading(false);
      return;
    }

    checkAuth();
  }, []);

  const setAuthToken = (token: string | null) => {
    if (token) {
      setStoredAuthToken(token);
      invalidateReadingHistoryCache();
      return;
    }

    clearStoredAuthToken();
    invalidateReadingHistoryCache();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ENTITLEMENTS_STORAGE_KEY);
    }
    emitAuthChanged();
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

  const syncLocalUserDataToServer = async () => {
    const localHistory = getReadingHistory();
    if (localHistory.length > 0) {
      await syncReadingHistoryAsync(localHistory);
      clearLocalReadingHistory();
    }

    const localWordbookWords = getLocalWordbookWords();
    if (localWordbookWords.length > 0 && typeof window !== 'undefined') {
      await api.post('/wordbook/sync', { words: localWordbookWords });
      window.localStorage.removeItem(WORDBOOK_STORAGE_KEY);
    }
  };

  const checkAuth = async () => {
    try {
      // console.log('Checking auth at:', API_URLS.me);
      const response = await api.get('/auth/me');

      if (response.status === 200) {
        const userData = response.data;
        console.log('User data:', userData);
        const nextUser = {
          ...userData.user,
          // subscriptionTier: userData.subscriptionTier || 'free',
        };
        clearStoredReaderWarning();
        setUser({
          ...nextUser,
        });

        try {
          await syncLocalUserDataToServer();
        } catch (migrationError) {
          console.error('Local data migration failed:', migrationError);
        }

        try {
          const nextEntitlements = await getSubscriptionEntitlements();
          persistEntitlements(nextEntitlements);
        } catch (entitlementError) {
          console.error('Entitlements fetch failed:', entitlementError);
          persistEntitlements(null);
        }

        emitAuthChanged();
      } else if (response.status === 401) {
        setUser(null);
        persistEntitlements(null);
        emitAuthChanged();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearStoredAuthToken();
      invalidateReadingHistoryCache();
      setUser(null);
      persistEntitlements(null);
      emitAuthChanged();
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
        setAuthToken(null);
        setUser(null);
        persistEntitlements(null);
        // Force a new auth check to ensure we're logged out
        await checkAuth();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if the logout request fails, clear the user state
      setAuthToken(null);
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
