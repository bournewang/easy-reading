'use client';

import { useEffect, useState } from 'react';
import { adminListOrders, type AdminOrder } from '@/lib/api/admin';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ['', 'success', 'pending', 'failed', 'expired'];

function formatDate(s: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'success' ? 'bg-emerald-100 text-emerald-800' :
    status === 'pending' ? 'bg-amber-100 text-amber-800' :
    'bg-rose-100 text-rose-700';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (p: number, s: string) => {
    setLoading(true);
    adminListOrders(p, PAGE_SIZE, s || undefined)
      .then((r) => { setItems(r.items); setTotalPages(r.totalPages); setTotal(r.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page, statusFilter); }, [page, statusFilter]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Orders <span className="ml-2 text-sm font-normal text-slate-400">{total} total</span></h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100">
            <tr>
              {['Order No', 'User', 'Plan', 'Amount', 'Method', 'Promo', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No orders found</td></tr>
            ) : items.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.orderNo}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{o.username}</td>
                <td className="px-4 py-3 text-slate-600 capitalize">{o.tier} · {o.duration}mo</td>
                <td className="px-4 py-3 text-slate-900">¥{o.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-500">{o.paymentMethod}</td>
                <td className="px-4 py-3 text-slate-400">{o.promoCode || '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-slate-400">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full px-4 py-2 text-sm ring-1 ring-slate-200 disabled:opacity-40">Prev</button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full px-4 py-2 text-sm ring-1 ring-slate-200 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
