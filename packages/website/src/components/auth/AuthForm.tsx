import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (data: any) => Promise<void>;
  initialReferralCode?: string;
}

const inputClass =
  'relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm';

export function AuthForm({ mode, onSubmit, initialReferralCode = '' }: AuthFormProps) {
  const router = useRouter();
  const { t } = useLocaleContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = (key: string) => t(`website.auth.${key}`);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    };

    if (mode === 'register') {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === 'login' ? auth('loginTitle') : auth('registerTitle')}
          </h2>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Username */}
            <div>
              <label htmlFor="username" className="sr-only">
                {mode === 'login' ? auth('usernameOrEmail') : auth('username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`${inputClass} rounded-t-md`}
                placeholder={mode === 'login' ? auth('usernameOrEmail') : auth('username')}
              />
            </div>

            {/* Full name — register only */}
            {mode === 'register' && (
              <div>
                <label htmlFor="fullName" className="sr-only">{auth('fullName')}</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className={inputClass}
                  placeholder={auth('fullNameOptional')}
                />
              </div>
            )}

            {/* Email — register only */}
            {mode === 'register' && (
              <div>
                <label htmlFor="email" className="sr-only">{auth('email')}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={inputClass}
                  placeholder={auth('emailOptional')}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="sr-only">{auth('password')}</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`${inputClass} rounded-b-md`}
                placeholder={auth('password')}
              />
            </div>
          </div>

          {/* Forgot password link */}
          {mode === 'login' && (
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {auth('forgotPassword')}
              </Link>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? auth('loading') : mode === 'login' ? auth('signIn') : auth('signUp')}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link
            href={mode === 'login' ? '/register' : '/login'}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {mode === 'login' ? auth('noAccount') : auth('haveAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}
