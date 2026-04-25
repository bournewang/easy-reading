'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { api } from '@/utils/api';

function ResetPasswordContent() {
  const { t } = useLocaleContext();
  const auth = (key: string) => t(`website.auth.${key}`);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-red-600 text-sm">{auth('resetPasswordInvalid')}</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
            {auth('forgotPasswordTitle')}
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(detail || auth('resetPasswordInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {auth('resetPasswordTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {auth('resetPasswordSubtitle')}
          </p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 p-5 text-center">
            <p className="text-sm font-medium text-green-800">{auth('resetPasswordSuccess')}</p>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="sr-only">{auth('newPassword')}</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={auth('newPassword')}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? auth('loading') : auth('resetPasswordSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
