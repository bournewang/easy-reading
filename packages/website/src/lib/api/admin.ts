import { api } from '../../utils/api';

export interface AdminUser {
  id: number;
  username: string;
  fullName: string | null;
  subscriptionTier: string;
  subscriptionExpires: string | null;
  isAdmin: boolean;
  commissionRate: number | null;
  referralCode: string | null;
  createdAt: string | null;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminOrder {
  id: number;
  orderNo: string;
  userId: number;
  username: string;
  amount: number;
  originalAmount: number;
  status: string;
  tier: string;
  duration: number;
  paymentMethod: string;
  promoCode: string | null;
  refundedAt: string | null;
  createdAt: string | null;
}

export interface AdminOrdersResponse {
  items: AdminOrder[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminCommission {
  id: number;
  referrerUsername: string;
  referredUsername: string;
  commissionAmount: number;
  commissionRate: number;
  status: string;
  unlocksAt: string | null;
  orderAmount: number;
  createdAt: string | null;
}

export interface AdminCommissionsResponse {
  items: AdminCommission[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function adminListUsers(page = 1, pageSize = 20, search?: string): Promise<AdminUsersResponse> {
  const params: Record<string, string | number> = { page, pageSize };
  if (search) params.search = search;
  const res = await api.get('/admin/users', { params });
  return res.data;
}

export async function adminUpdateUser(userId: number, patch: Partial<{
  subscriptionTier: string;
  subscriptionExpires: string | null;
  isAdmin: boolean;
  commissionRate: number | null;
}>): Promise<AdminUser> {
  const res = await api.patch(`/admin/users/${userId}`, patch);
  return res.data;
}

export async function adminListOrders(page = 1, pageSize = 20, status?: string): Promise<AdminOrdersResponse> {
  const params: Record<string, string | number> = { page, pageSize };
  if (status) params.status = status;
  const res = await api.get('/admin/orders', { params });
  return res.data;
}

export async function adminListCommissions(page = 1, pageSize = 20, status?: string): Promise<AdminCommissionsResponse> {
  const params: Record<string, string | number> = { page, pageSize };
  if (status) params.status = status;
  const res = await api.get('/admin/commissions', { params });
  return res.data;
}

export async function adminUpdateCommission(id: number, status: string): Promise<void> {
  await api.patch(`/admin/commissions/${id}`, { status });
}

export async function adminRefundOrder(orderNo: string): Promise<void> {
  await api.post(`/admin/orders/${orderNo}/refund`, {});
}
