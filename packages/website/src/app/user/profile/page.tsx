'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

export default function UserProfilePage() {
  const { user, loading, checkAuth } = useAuth();
  const router = useRouter();
  const { t } = useLocaleContext();
  const userText = (key: string) => t(`website.userPage.${key}`);

  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user?.email) {
      setEmail(user.email);
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await api.put('/auth/profile', { email: email.trim() });
      await checkAuth();
      setMessage(userText('profileSaved'));
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.message ||
        submitError?.response?.data?.detail ||
        userText('profileSaveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-slate-600">{userText('profileLoading')}</div>;
  }

  return (
    <div className="min-h-[70vh] bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{userText('profileSettings')}</h1>
            <p className="mt-1 text-sm text-slate-600">{userText('profileSettingsHint')}</p>
          </div>
          <Link
            href="/user"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {userText('backToUserCenter')}
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
              {userText('username')}
            </label>
            <input
              id="username"
              type="text"
              value={user.username}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
              {userText('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="name@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-orange-500/30 transition focus:border-orange-400 focus:ring"
            />
          </div>

          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ea580c] disabled:opacity-60"
          >
            {saving ? userText('profileSaving') : userText('profileSave')}
          </button>
        </form>
      </div>
    </div>
  );
}
