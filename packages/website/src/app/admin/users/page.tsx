'use client';

import { useEffect, useState } from 'react';
import { adminListUsers, adminUpdateUser, type AdminUser } from '@/lib/api/admin';

const PAGE_SIZE = 20;

function formatDate(s: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [editFields, setEditFields] = useState<{
    subscriptionTier: string;
    isAdmin: boolean;
    commissionRate: string;
  }>({ subscriptionTier: 'free', isAdmin: false, commissionRate: '' });

  const load = (p: number, q: string) => {
    setLoading(true);
    adminListUsers(p, PAGE_SIZE, q || undefined)
      .then((r) => { setItems(r.items); setTotalPages(r.totalPages); setTotal(r.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page, search); }, [page, search]);

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setEditFields({
      subscriptionTier: u.subscriptionTier,
      isAdmin: u.isAdmin,
      commissionRate: u.commissionRate !== null ? String(u.commissionRate) : '',
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const rate = editFields.commissionRate.trim();
      const updated = await adminUpdateUser(editing.id, {
        subscriptionTier: editFields.subscriptionTier,
        isAdmin: editFields.isAdmin,
        commissionRate: rate !== '' ? parseFloat(rate) : undefined,
      });
      setItems((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Users <span className="ml-2 text-sm font-normal text-slate-400">{total} total</span></h1>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput); }} className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search username or name…"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
          />
          <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100">
            <tr>
              {['ID', 'Username', 'Plan', 'Expires', 'Commission rate', 'Admin', 'Joined', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No users found</td></tr>
            ) : items.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-400">{u.id}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{u.username}<span className="ml-1 text-slate-400">{u.fullName ? `(${u.fullName})` : ''}</span></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.subscriptionTier === 'pro' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {u.subscriptionTier}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(u.subscriptionExpires)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {u.commissionRate !== null ? `${Math.round(u.commissionRate * 100)}%` : <span className="text-slate-300">default</span>}
                </td>
                <td className="px-4 py-3">{u.isAdmin ? <span className="text-emerald-600 font-semibold">Yes</span> : <span className="text-slate-300">No</span>}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(u)} className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Edit</button>
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

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-slate-900">Edit user: {editing.username}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Plan</label>
                <select
                  value={editFields.subscriptionTier}
                  onChange={(e) => setEditFields((f) => ({ ...f, subscriptionTier: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Commission rate (e.g. 0.15 for 15%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="Leave blank for system default"
                  value={editFields.commissionRate}
                  onChange={(e) => setEditFields((f) => ({ ...f, commissionRate: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="is-admin"
                  type="checkbox"
                  checked={editFields.isAdmin}
                  onChange={(e) => setEditFields((f) => ({ ...f, isAdmin: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="is-admin" className="text-sm font-medium text-slate-700">Admin access</label>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 rounded-full py-2 text-sm font-semibold ring-1 ring-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
