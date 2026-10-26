import { getAccessToken, type AuthUser } from '@/lib/auth-context';
import { API_BASE } from '@/lib/api';

export async function uploadAvatar(file: File): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const body = new FormData();
  body.append('avatar', file);
  const response = await fetch(`${API_BASE}/auth/me/avatar`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body,
  });
  const result = await response.json().catch(() => null) as { success: boolean; message?: string; data?: AuthUser } | null;
  if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  if (!response.ok || !result?.success || !result.data) {
    throw new Error(result?.message ?? 'Không thể tải ảnh đại diện. Vui lòng thử lại.');
  }
  return result.data;
}
