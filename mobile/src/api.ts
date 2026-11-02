import Constants from 'expo-constants';
import type { AuthUser, Role, Session } from './types';

const baseUrl = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'https://7fcg51215k.execute-api.us-east-1.amazonaws.com/staging';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const text = await response.text();
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = text; }
  if (!response.ok) {
    const errorBody = body as { message?: string; error?: string };
    throw new ApiError(response.status, errorBody.message ?? errorBody.error ?? 'Request failed');
  }
  return body as T;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

export const api = {
  sendOtp: (phone: string, purpose: 'login' | 'register') => request<{ otpId: string; expiresAt: string }>('/auth/whatsapp-otp', { method: 'POST', body: JSON.stringify({ phone: formatPhone(phone), purpose }) }),
  verifyOtp: (body: { otpId: string; code: string; phone: string; purpose: 'login' | 'register'; registrationData?: { name: string; email: string; role: Role } }) => request<Session & { cognitoSub?: string; role: Role; approvalStatus: string }>('/auth/whatsapp-otp/verify', { method: 'PUT', body: JSON.stringify({ ...body, phone: formatPhone(body.phone) }) }),
  passwordLogin: (identifier: string, password: string) => request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  refresh: (refreshToken: string) => request<Session>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
};

export function decodeUser(idToken: string): AuthUser | null {
  try {
    const payload = idToken.split('.')[1];
    const claims = JSON.parse(globalThis.atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
    return { sub: String(claims.sub), role: (claims['custom:role'] as Role) ?? 'client', email: String(claims.email ?? ''), phone: String(claims.phone_number ?? ''), name: String(claims.name ?? ''), approvalStatus: String(claims['custom:approvalStatus'] ?? 'active') };
  } catch { return null; }
}
