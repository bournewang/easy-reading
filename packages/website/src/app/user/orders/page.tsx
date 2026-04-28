'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrders, requestRefund, type UserOrder } from '@/lib/api/payment';

const PAGE_SIZE = 20;

function formatDate(s: string | null): string {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
}

function isWithin7Days(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  return Date.now() - created < 7 * 24 * 60 * 60 * 1000;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'success'  ? 'bg-emerald-100 text-emerald-800' :
    status === 'refunded' ? 'bg-purple-100 text-purple-800' :
    status === 'pending'  ? 'bg-amber-100 text-amber-800' :
    'bg-slate-100 text-slate-500';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

export default function UserOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<UserOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const load = (p: number) => {
    setFetching(true);
    getUserOrders(p, PAGE_SIZE)
      .then((r) => { setItems(r.items); setTotalPages(r.totalPages); setTotal(r.total); })
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    if (user) load(page);
  }, [user, page]);

  const handleRefund = async (order: UserOrder) => {
    if (!confirm(`Apply for a refund for order ${order.orderNo}?\n\nThis will cancel your current subscription.`)) return;
    setRefunding(order.orderNo);
    try {
      await requestRefund(order.orderNo);
      setItems((prev) => prev.map((o) => o.orderNo === order.orderNo ? { ...o, status: 'refunded', refundedAt: new Date().toISOString() } : o));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Refund failed. Please try again.';
      alert(msg);
    } finally {
      setRefunding(null);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">My Orders</h1>
        <p className="mt-1 text-sm text-slate-500">{total} order{total !== 1 ? 's' : ''} total</p>
      </div>

      {fetching ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
          No orders yet
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((o) => {
            const canRefund = o.status === 'success' && isWithin7Days(o.createdAt);
            return (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{o.orderNo}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-1 text-sm font-medium capitalize text-slate-900">
                      {o.tier} · {o.duration} month{o.duration !== 1 ? 's' : ''}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2 text-sm">
                      <span className="font-semibold text-slate-900">¥{o.amount.toFixed(2)}</span>
                      {o.originalAmount > o.amount && (
                        <span className="text-xs text-slate-400 line-through">¥{o.originalAmount.toFixed(2)}</span>
                      )}
                      {o.promoCode && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{o.promoCode}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {o.paymentMethod} · {formatDate(o.createdAt)}
                      {o.status === 'refunded' && o.refundedAt && (
                        <span className="ml-2 text-purple-500">Refunded on {formatDate(o.refundedAt)}</span>
                      )}
                    </div>
                  </div>
                  {canRefund && (
                    <button
                      onClick={() => handleRefund(o)}
                      disabled={refunding === o.orderNo}
                      className="shrink-0 rounded-full border border-rose-200 px-4 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {refunding === o.orderNo ? 'Processing…' : 'Refund'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full px-4 py-2 text-sm ring-1 ring-slate-200 disabled:opacity-40">Previous</button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full px-4 py-2 text-sm ring-1 ring-slate-200 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
