'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { api } from '@/utils/api';

export default function ForgotPasswordPage() {
  const { t } = useLocaleContext();
  const auth = (key: string) => t(`website.auth.${key}`);

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || auth('genericError'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {auth('forgotPasswordTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {auth('forgotPasswordSubtitle')}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-md bg-green-50 p-5 text-center">
            <p className="text-sm font-medium text-green-800">{auth('forgotPasswordSent')}</p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              {auth('backToLogin')}
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="sr-only">{auth('email')}</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={auth('email')}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? auth('loading') : auth('forgotPasswordSubmit')}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                {auth('backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
