'use client';

import { AuthForm } from '@/components/auth/AuthForm';
// import { API_URLS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '../../utils/api';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    fallback
  );
}

export default function LoginPage() {
  const { checkAuth, setAuthToken } = useAuth();
  const { t } = useLocaleContext();

  const handleLogin = async (data: any) => {
    try {
      const response = await api.post('/auth/login', data);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.data?.message || response.data?.detail || t('website.auth.loginFailed'));
      }

      setAuthToken(response.data?.token || null);
      await checkAuth();
      return response.data;
    } catch (error: any) {
      throw new Error(getErrorMessage(error, t('website.auth.loginFailed')));
    }
  };

  return <AuthForm mode="login" onSubmit={handleLogin} />;
}
