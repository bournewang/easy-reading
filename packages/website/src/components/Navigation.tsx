'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@easy-reading/shared/components/LanguageSwitcher';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLocaleContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;
  const nav = (key: string) => t(`website.navigation.${key}`);
  const common = (key: string) => t(`website.common.${key}`);
  const pathSegments = pathname.split('/').filter(Boolean);
  const isBookReaderRoute = pathSegments[0] === 'books' && pathSegments.length >= 3;
  const isReaderRoute = pathname.startsWith('/news-reader') || pathname.startsWith('/ielts-reader') || isBookReaderRoute;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { href: '/', label: nav('home') },
    { href: '/news', label: nav('news') },
    { href: '/ielts', label: nav('ielts') },
    { href: '/books/b11', label: nav('books') },
    { href: '/wordlist', label: nav('wordBook') },
    { href: '/history', label: nav('history') },
    { href: '/pricing', label: nav('pricing') },
  ];

  const accountItems = user
    ? [{ href: '/user', label: nav('userCenter') }]
    : [
        { href: '/login', label: nav('login') },
        { href: '/register', label: nav('register') },
      ];

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
    <>
      <nav className={`sticky top-0 z-50 w-full px-3 ${isReaderRoute ? 'pt-2' : 'pt-3'}`}>
        <div className="mx-auto max-w-[1440px] px-2 sm:px-6">
          <div className={`flex items-center justify-between gap-3 border border-[#d7dee9] bg-white/88 backdrop-blur-xl ${isReaderRoute ? 'min-h-12 rounded-[24px] px-3 py-2 sm:min-h-14 sm:rounded-full sm:px-4' : 'min-h-12 rounded-[24px] px-3 py-2 sm:min-h-14 sm:rounded-full sm:px-4'} shadow-[0_12px_30px_rgba(15,23,42,0.08)]`}>
          <Link 
            href="/" 
            className="px-3 py-2 text-[15px] font-semibold tracking-[-0.02em] text-[#1d1d1f] transition-opacity hover:opacity-80"
          >
            English Reader
          </Link>

            <div className="hidden flex-wrap items-center justify-end gap-2 sm:gap-3 lg:flex">
              {navItems.map((item) => (
                <NavigationItem key={item.href} href={item.href} label={item.label} />
              ))}

              <div className="rounded-full bg-[#eef2f7] p-1">
                <LanguageSwitcher />
              </div>

              {user ? (
                <>
                  {getSubscriptionBadge()}
                  {accountItems.map((item) => (
                    <NavigationItem key={item.href} href={item.href} label={item.label} />
                  ))}
                </>
              ) : (
                <>
                  {accountItems.map((item) => (
                    <NavigationItem key={item.href} href={item.href} label={item.label} />
                  ))}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="rounded-full bg-[#eef2f7] p-1">
                <LanguageSwitcher />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eef2f7] text-[#1d1d1f] transition-colors hover:bg-[#e4e9f0]"
              >
                <span className="flex h-4 w-4 flex-col items-center justify-center gap-[3px]">
                  <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-transform ${isMobileMenuOpen ? 'translate-y-[4.5px] rotate-45' : ''}`} />
                  <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-opacity ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-transform ${isMobileMenuOpen ? '-translate-y-[4.5px] -rotate-45' : ''}`} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className={`fixed inset-0 z-40 bg-[#0f172a]/24 transition-opacity lg:hidden ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
      <div className={`fixed inset-x-3 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 origin-top rounded-[28px] border border-[#d7dee9] bg-white/96 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-200 lg:hidden ${isMobileMenuOpen ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0'}`}>
        <div className="grid grid-cols-2 gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive(item.href) ? 'bg-[#e8f2ff] text-[#005bb5]' : 'bg-[#f6f8fb] text-[#1d1d1f]/80 hover:bg-[#eff2f6]'}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#f6f8fb] px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1d1d1f]/45">Account</p>
            <p className="truncate text-sm font-medium text-[#1d1d1f]">{user ? user.email || nav('userCenter') : nav('login')}</p>
          </div>
          {user ? getSubscriptionBadge() : null}
        </div> */}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {accountItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive(item.href) ? 'bg-[#e8f2ff] text-[#005bb5]' : 'bg-[#f6f8fb] text-[#1d1d1f]/80 hover:bg-[#eff2f6]'}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
