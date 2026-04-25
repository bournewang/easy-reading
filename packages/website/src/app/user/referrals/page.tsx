'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReferralCommissions,
  type ReferralCommissionItem,
} from '@/lib/api/referral';

const PAGE_SIZE = 20;

function StatusBadge({ status, label }: { status: string; label: string }) {
  const isPaid = status === 'paid';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isPaid
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      {label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
}

export default function ReferralDetailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLocaleContext();

  const [items, setItems] = useState<ReferralCommissionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userText = (key: string) => t(`website.userPage.${key}`);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setDataLoading(true);
    setError(null);

    getReferralCommissions(page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load referral details.');
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, page]);

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-10 w-32 rounded-full bg-white shadow-sm" />
          <div className="h-[28rem] rounded-[30px] bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_28%),radial-gradient(circle_at_88%_14%,_rgba(251,146,60,0.18),_transparent_22%),linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_42%,_#eef2f7_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/user"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4" />
            </svg>
            {userText('referralBackToProfile')}
          </Link>
        </div>

        <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_26px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(255,247,237,0.92)_100%)] xl:p-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {userText('referralTitle')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {userText('referralDetailsTitle')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {userText('referralDetailsSubtitle')}
            </p>
          </div>

          <div className="mt-6">
            {error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : dataLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-[18px] bg-slate-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[24px] border border-orange-100 bg-white px-6 py-12 text-center">
                <p className="text-base font-semibold text-slate-700">{userText('referralNoCommissions')}</p>
                <p className="mt-2 text-sm text-slate-500">{userText('referralNoCommissionsBody')}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {userText('referralDetailsUser')}
                        </th>
                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {userText('referralDetailsPlan')}
                        </th>
                        <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {userText('referralDetailsAmount')}
                        </th>
                        <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {userText('referralDetailsCommission')}
                        </th>
                        <th className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {userText('referralDetailsStatus')}
                        </th>
                        <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {userText('referralDetailsDate')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.id} className="group">
                          <td className="py-3.5 pr-4 font-medium text-slate-900">
                            {item.referredUsername}
                          </td>
                          <td className="py-3.5 pr-4 text-slate-600">
                            {item.orderTier ? (
                              <span className="capitalize">{item.orderTier}</span>
                            ) : (
                              '-'
                            )}
                            {item.orderDuration ? (
                              <span className="ml-1 text-slate-400">
                                {item.orderDuration}mo
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3.5 pr-4 text-right text-slate-600">
                            ¥{item.orderAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 pr-4 text-right font-semibold text-slate-900">
                            ¥{item.commissionAmount.toFixed(2)}
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              ({Math.round(item.commissionRate * 100)}%)
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-center">
                            <StatusBadge
                              status={item.status}
                              label={
                                item.status === 'paid'
                                  ? userText('referralStatusPaid')
                                  : userText('referralStatusPending')
                              }
                            />
                          </td>
                          <td className="py-3.5 text-right text-slate-500">
                            {formatDate(item.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 ? (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      {total} total
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4" />
                        </svg>
                      </button>
                      <span className="text-sm text-slate-600">
                        {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l4 4-4 4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
