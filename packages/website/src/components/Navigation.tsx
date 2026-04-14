'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@easy-reading/shared/components/LanguageSwitcher';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLocaleContext();

  const isActive = (path: string) => pathname === path;
  const nav = (key: string) => t(`website.navigation.${key}`);
  const common = (key: string) => t(`website.common.${key}`);

  const getSubscriptionBadge = () => {
    if (!user) return null;
    
    const tier = user.subscriptionTier || 'free';
    const expires = user.subscriptionExpires ? new Date(user.subscriptionExpires) : null;
    const isExpired = expires && expires < new Date();

    const badgeColors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800'
    };

    return (
      <div className={`px-2 py-1 text-xs font-medium rounded-full ${badgeColors[tier as keyof typeof badgeColors]}`}>
        {common(`${tier}Plan`)}
        {isExpired && ' (Expired)'}
      </div>
    );
  };

  const NavigationItem = ({ href, label }: { href: string, label: string}) => {
    return (
      <Link
        href={href}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all
        ${isActive(href)
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 w-full top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex min-h-16 items-center justify-between gap-4 py-3">
          <Link 
            href="/" 
            className="px-4 py-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-blue-500 hover:to-indigo-500 transition-all"
          >
            English Reader
          </Link>
          
          <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
            <NavigationItem href="/" label={nav('home')} />
            <NavigationItem href="/news" label={nav('news')} />
            <NavigationItem href="/ielts" label="IELTS" />
            <NavigationItem href="/books/b11" label={nav('books')} />
            <NavigationItem href="/wordlist" label={nav('wordBook')} />
             
            <NavigationItem href="/history" label={nav('history')} />
            {/* <NavigationItem href="/pricing" label="Pricing" /> */}

            <LanguageSwitcher />

            {user ? (
              <>
                {getSubscriptionBadge()}
                <NavigationItem href="/user" label={nav('userCenter')} />
              </>
            ) : (
              <>
                <NavigationItem href="/login" label={nav('login')} />
                <NavigationItem href="/register" label={nav('register')} />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
