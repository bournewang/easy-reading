'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminListNews,
  adminUpdateNewsStatus,
  adminDeleteNews,
  type AdminNewsItem,
} from '@/lib/api/admin';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ['', 'active', 'inactive', 'draft'];

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'   ? 'bg-emerald-100 text-emerald-800' :
    status === 'inactive' ? 'bg-slate-100 text-slate-500' :
                            'bg-amber-100 text-amber-800';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

function formatDate(s: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

export default function AdminNewsPage() {
  const [items, setItems] = useState<AdminNewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback((p: number, s: string, q: string) => {
    setLoading(true);
    adminListNews(p, PAGE_SIZE, s || undefined, q || undefined)
      .then((r) => {
        setItems(r.items);
        setTotalPages(r.totalPages);
        setTotal(r.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page, statusFilter, search); }, [load, page, statusFilter, search]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await adminUpdateNewsStatus(id, newStatus);
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: newStatus } : item));
    } catch (e: unknown) {
      alert((e as Error).message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeletingId(id);
    try {
      await adminDeleteNews(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((t) => t - 1);
    } catch (e: unknown) {
      alert((e as Error).message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">
          News <span className="ml-2 text-sm font-normal text-slate-400">{total} total</span>
        </h1>

        <form onSubmit={handleSearch} className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Search title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100">
            <tr>
              {['ID', 'Title', 'Category', 'Source', 'Words', 'Status', 'Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No news found</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-xs text-slate-400">{item.id}</td>
                <td className="max-w-xs px-4 py-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 font-medium text-slate-900 hover:text-blue-600 hover:underline"
                  >
                    {item.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-slate-500">{item.category}</td>
                <td className="px-4 py-3 text-slate-500">{item.source}</td>
                <td className="px-4 py-3 text-slate-400">{item.wordCount}</td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-slate-400">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="draft">draft</option>
                    </select>
                    <button
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id, item.title)}
                      className="rounded-full px-3 py-1 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                    >
                      {deletingId === item.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">Page {page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
