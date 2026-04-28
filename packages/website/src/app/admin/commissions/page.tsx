'use client';

import { useEffect, useState } from 'react';
import { adminListCommissions, adminUpdateCommission, type AdminCommission } from '@/lib/api/admin';

const PAGE_SIZE = 20;

function formatDate(s: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

export default function AdminCommissionsPage() {
  const [items, setItems] = useState<AdminCommission[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = (p: number, s: string) => {
    setLoading(true);
    adminListCommissions(p, PAGE_SIZE, s || undefined)
      .then((r) => { setItems(r.items); setTotalPages(r.totalPages); setTotal(r.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page, statusFilter); }, [page, statusFilter]);

  const markPaid = async (id: number) => {
    setUpdating(id);
    try {
      await adminUpdateCommission(id, 'paid');
      setItems((prev) => prev.map((c) => c.id === id ? { ...c, status: 'paid' } : c));
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Commissions <span className="ml-2 text-sm font-normal text-slate-400">{total} total</span></h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="available">Available</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100">
            <tr>
              {['Referrer', 'Referred user', 'Order amount', 'Commission', 'Rate', 'Status', 'Unlocks at', 'Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No commissions found</td></tr>
            ) : items.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">{c.referrerUsername}</td>
                <td className="px-4 py-3 text-slate-600">{c.referredUsername}</td>
                <td className="px-4 py-3 text-slate-600">¥{c.orderAmount.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">¥{c.commissionAmount.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-500">{Math.round(c.commissionRate * 100)}%</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    c.status === 'paid'      ? 'bg-emerald-100 text-emerald-800' :
                    c.status === 'available' ? 'bg-blue-100 text-blue-800' :
                    c.status === 'pending'   ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{c.status === 'pending' && c.unlocksAt ? formatDate(c.unlocksAt) : '—'}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  {(c.status === 'pending' || c.status === 'available') && (
                    <button
                      onClick={() => markPaid(c.id)}
                      disabled={updating === c.id}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updating === c.id ? '…' : 'Mark paid'}
                    </button>
                  )}
                </td>
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
