import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (data: any) => Promise<void>;
  initialReferralCode?: string;
}

const fieldClass =
  'mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15';

export function AuthForm({ mode, onSubmit, initialReferralCode = '' }: AuthFormProps) {
  const router = useRouter();
  const { t } = useLocaleContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = (key: string) => t(`website.auth.${key}`);

  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    };

    if (!isLogin) {
      const fullName = formData.get('fullName') as string;
      const email = (formData.get('email') as string).trim();
      if (fullName) data.fullName = fullName;
      if (email) data.email = email;
      if (initialReferralCode) data.referralCode = initialReferralCode;
    }

    try {
      await onSubmit(data);
      router.push('/');
    } catch (err: any) {
      setError(err.message || auth('genericError'));
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
              {isLogin ? auth('loginTitle') : auth('registerTitle')}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              {isLogin
                ? auth('loginDescription')
                : auth('registerDescription')}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="text-sm font-medium text-slate-700">
                {isLogin ? auth('usernameOrEmail') : auth('username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={fieldClass}
                placeholder={isLogin ? auth('usernameOrEmail') : auth('username')}
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                  {auth('fullName')}
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className={fieldClass}
                  placeholder={auth('fullNameOptional')}
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  {auth('email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={fieldClass}
                  placeholder={auth('emailOptional')}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                {auth('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={fieldClass}
                placeholder={auth('password')}
              />
            </div>

            {isLogin && (
              <div className="flex justify-end pt-1">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                >
                  {auth('forgotPassword')}
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? auth('loading') : isLogin ? auth('signIn') : auth('signUp')}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-600">
            <Link
              href={isLogin ? '/register' : '/login'}
              className="font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              {isLogin ? auth('noAccount') : auth('haveAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
