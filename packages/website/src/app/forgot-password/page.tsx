'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { api } from '@/utils/api';

const fieldClass =
  'mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15';

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
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(79,70,229,0.22),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.14),transparent_40%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Easy Reading
            </span>
            <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              {auth('forgotPasswordTitle')}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              {auth('forgotPasswordSubtitle')}
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <p className="text-sm font-medium leading-6 text-emerald-800">{auth('forgotPasswordSent')}</p>
              <Link
                href="/login"
                className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {auth('backToLogin')}
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  {auth('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={auth('email')}
                  className={fieldClass}
                />
              </div>

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? auth('loading') : auth('forgotPasswordSubmit')}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                  {auth('backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
