'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type RouteRedirectClientProps = {
  href: string;
  label?: string;
};

export default function RouteRedirectClient({
  href,
  label = 'Continue',
}: RouteRedirectClientProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href, { scroll: false });
  }, [href, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-sm text-slate-600">Redirecting...</p>
        <Link
          href={href}
          className="mt-3 inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
