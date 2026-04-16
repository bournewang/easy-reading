'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type IELTSRedirectPageClientProps = {
  targetUrl: string;
};

export default function IELTSRedirectPageClient({ targetUrl }: IELTSRedirectPageClientProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(targetUrl);
  }, [router, targetUrl]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-12 text-center">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Redirecting to the first passage...</p>
        <Link
          href={targetUrl}
          className="mt-4 inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Open passage
        </Link>
      </div>
    </div>
  );
}
