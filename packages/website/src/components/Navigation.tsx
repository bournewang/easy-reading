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
      free: 'bg-[#eef2f7] text-[#1d1d1f]',
      pro: 'bg-[#0071e3]/12 text-[#0071e3]',
    };

    return (
      <div className={`rounded-full px-3 py-1 text-xs font-medium ${badgeColors[tier as keyof typeof badgeColors]}`}>
        {common(`${tier}Plan`)}
        {isExpired && ' (Expired)'}
      </div>
    );
  };

  const NavigationItem = ({ href, label }: { href: string, label: string}) => {
    return (
      <Link
        href={href}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-all
        ${isActive(href)
          ? 'bg-[#e8f2ff] text-[#005bb5] shadow-[inset_0_0_0_1px_rgba(0,113,227,0.08)]'
          : 'text-[#1d1d1f]/76 hover:bg-[#eff2f6] hover:text-[#1d1d1f]'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="sticky top-0 z-50 w-full px-3 pt-3">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="flex min-h-14 items-center justify-between gap-4 rounded-full border border-[#d7dee9] bg-white/88 px-4 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <Link 
            href="/" 
            className="px-3 py-2 text-[15px] font-semibold tracking-[-0.02em] text-[#1d1d1f] transition-opacity hover:opacity-80"
          >
            English Reader
          </Link>
          
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <NavigationItem href="/" label={nav('home')} />
            <NavigationItem href="/news" label={nav('news')} />
            <NavigationItem href="/ielts" label={nav('ielts')} />
            <NavigationItem href="/books/b11" label={nav('books')} />
            <NavigationItem href="/wordlist" label={nav('wordBook')} />
             
            <NavigationItem href="/history" label={nav('history')} />
            <NavigationItem href="/pricing" label={nav('pricing')} />

            <div className="rounded-full bg-[#eef2f7] p-1">
              <LanguageSwitcher />
            </div>

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
