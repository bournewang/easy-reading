'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
// import { API_URLS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
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

function RegisterPageContent() {
  const { checkAuth, setAuthToken } = useAuth();
  const { t } = useLocaleContext();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref')?.trim().toUpperCase() || '';

  const handleRegister = async (data: any) => {
    try {
      const response = await api.post('/auth/register', data);

      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.data?.message || response.data?.detail || t('website.auth.registerFailed'));
      }

      setAuthToken(response.data?.token || null);
      await checkAuth();
      return response.data;
    } catch (error: any) {
      throw new Error(getErrorMessage(error, t('website.auth.registerFailed')));
    }
  };

  return <AuthForm mode="register" onSubmit={handleRegister} initialReferralCode={referralCode} />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
