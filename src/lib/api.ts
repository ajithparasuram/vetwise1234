/**
 * VetWise API Client
 *
 * Talks to the AWS API Gateway + Cognito backend defined in /infrastructure.
 * Base URL defaults to the staging endpoint and is overridable via VITE_API_BASE_URL.
 */

export type Role = 'client' | 'doctor' | 'admin' | 'frontdesk';

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  sub: string;
  role: Role;
  email?: string;
  phone?: string;
  name?: string;
  approvalStatus?: string;
}

export class ApiUnavailableError extends Error {
  constructor() {
    super('Backend API is not configured. Set VITE_API_BASE_URL to connect.');
    this.name = 'ApiUnavailableError';
  }
}

export class ApiError extends Error {
  status: number;
  details?: string;
  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://7fcg51215k.execute-api.us-east-1.amazonaws.com/staging';

function getToken(): string | null {
  return sessionStorage.getItem('vetwise_access_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!baseUrl) throw new ApiUnavailableError();

  const token = getToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : {}; } catch { body = text; }

  if (!response.ok) {
    const errBody = body as { message?: string; error?: string };
    throw new ApiError(response.status, errBody.message ?? errBody.error ?? `Request failed (${response.status})`);
  }

  return body as T;
}

export const api = {
  // ---- Auth ----
  signup: (body: { name: string; phone: string; email: string; password: string; role: Role }) =>
    request<AuthSession & { cognitoSub: string; role: Role; approvalStatus: string }>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { identifier: string; password: string }) =>
    request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  sendOtp: (body: { identifier: string; channel?: string }) =>
    request<{ session: string; challengeName: string; message: string }>('/auth/otp', { method: 'POST', body: JSON.stringify(body) }),

  verifyOtp: (body: { session: string; code: string; identifier?: string }) =>
    request<AuthSession>('/auth/otp', { method: 'PUT', body: JSON.stringify(body) }),

  sendWhatsappOtp: (body: { phone: string; purpose: 'login' | 'register' }) =>
    request<{ otpId: string; message: string; expiresAt: string }>('/auth/whatsapp-otp', { method: 'POST', body: JSON.stringify(body) }),

  verifyWhatsappOtp: (body: { otpId: string; code: string; phone: string; purpose: 'login' | 'register'; registrationData?: { name: string; email: string; role: Role } }) =>
    request<AuthSession & { cognitoSub: string; role: Role; approvalStatus: string; isNewUser: boolean }>('/auth/whatsapp-otp/verify', { method: 'POST', body: JSON.stringify(body) }),

  forgotPassword: (body: { identifier: string }) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),

  refresh: (body: { refreshToken: string }) =>
    request<{ accessToken: string; idToken: string; expiresIn: number }>('/auth/refresh', { method: 'POST', body: JSON.stringify(body) }),

  // ---- Clients ----
  getClients: () => request<unknown[]>('/clients'),
  createClient: (body: unknown) => request<unknown>('/clients', { method: 'POST', body: JSON.stringify(body) }),
  updateClient: (id: string, body: unknown) => request<unknown>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // ---- Patients ----
  getPatients: () => request<unknown[]>('/patients'),
  createPatient: (body: unknown) => request<unknown>('/patients', { method: 'POST', body: JSON.stringify(body) }),
  updatePatient: (id: string, body: unknown) => request<unknown>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // ---- Appointments ----
  getAppointments: () => request<unknown[]>('/appointments'),
  createAppointment: (body: unknown) => request<unknown>('/appointments', { method: 'POST', body: JSON.stringify(body) }),
  updateAppointment: (id: string, body: unknown) => request<unknown>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // ---- Clinical Records ----
  getClinicalRecords: (petId?: string) =>
    request<unknown[]>(`/clinical-records${petId ? `?petId=${petId}` : ''}`),
  createClinicalRecord: (body: unknown) => request<unknown>('/clinical-records', { method: 'POST', body: JSON.stringify(body) }),

  // ---- Prescriptions ----
  getPrescriptions: (petId?: string) =>
    request<unknown[]>(`/prescriptions${petId ? `?petId=${petId}` : ''}`),
  createPrescription: (body: unknown) => request<unknown>('/prescriptions', { method: 'POST', body: JSON.stringify(body) }),
  getPrescription: (id: string) => request<unknown>(`/prescriptions/${id}`),
  finalizePrescription: (id: string) => request<unknown>(`/prescriptions/${id}/finalize`, { method: 'POST' }),
  getPrescriptionPdf: (id: string) => request<{ url: string; expiresIn: number }>(`/prescriptions/${id}/pdf`),

  // ---- Payments ----
  getPayments: () => request<unknown[]>('/payments'),
  createOrder: (body: { resourceType: string; resourceId: string }) =>
    request<{ orderId: string; amount: number; currency: string; keyId: string; paymentId: string }>('/payments/orders', { method: 'POST', body: JSON.stringify(body) }),
  verifyPayment: (body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; paymentId: string }) =>
    request<{ verified: boolean; paymentId: string }>('/payments/verify', { method: 'POST', body: JSON.stringify(body) }),

  // ---- Subscriptions ----
  getSubscriptions: () => request<unknown[]>('/subscriptions'),
  createSubscription: (body: { planId: string; ownerId?: string }) =>
    request<unknown>('/subscriptions', { method: 'POST', body: JSON.stringify(body) }),
  getSubscription: (id: string) => request<unknown>(`/subscriptions/${id}`),
  cancelSubscription: (id: string) => request<unknown>(`/subscriptions/${id}/cancel`, { method: 'POST' }),

  // ---- Doctors ----
  getDoctors: () => request<unknown[]>('/doctors'),
  createDoctor: (body: unknown) => request<unknown>('/doctors', { method: 'POST', body: JSON.stringify(body) }),
  getPendingDoctors: () => request<unknown[]>('/doctors/pending'),
  approveDoctor: (id: string) => request<unknown>(`/doctors/${id}/approve`, { method: 'POST' }),
  rejectDoctor: (id: string) => request<unknown>(`/doctors/${id}/reject`, { method: 'POST' }),

  // ---- Notifications ----
  getNotifications: () => request<unknown[]>('/notifications'),

  // ---- AI Health Checker ----
  aiHealthCheck: (body: unknown) => request<unknown>('/ai/health-check', { method: 'POST', body: JSON.stringify(body) }),

  // ---- Serviceability ----
  checkServiceability: (lat: number, lng: number) =>
    request<{ status: string; serviceAreaName: string | null; message: string; distanceKm?: number }>(`/serviceability?lat=${lat}&lng=${lng}`),

  // ---- Contact ----
  submitContact: (body: { name: string; email: string; phone?: string; topic?: string; message: string }) =>
    request<{ message: string; enquiryId: string }>('/contact', { method: 'POST', body: JSON.stringify(body) }),

  // ---- Settings ----
  getSettings: () => request<{
    brand: { name: string; company: string; supportEmail: string };
    plans: unknown[];
    serviceAreas: unknown[];
    features: Record<string, boolean>;
    booking: { minAdvanceHours: number; maxAdvanceDays: number; cancellationWindowHours: number };
  }>('/settings'),
};

export function isApiAvailable(): boolean {
  return !!baseUrl;
}

export function storeSession(session: AuthSession): void {
  sessionStorage.setItem('vetwise_access_token', session.accessToken);
  sessionStorage.setItem('vetwise_id_token', session.idToken);
  sessionStorage.setItem('vetwise_refresh_token', session.refreshToken);
}

export function clearSession(): void {
  sessionStorage.removeItem('vetwise_access_token');
  sessionStorage.removeItem('vetwise_id_token');
  sessionStorage.removeItem('vetwise_refresh_token');
}

export function getStoredSession(): AuthSession | null {
  const accessToken = sessionStorage.getItem('vetwise_access_token');
  const idToken = sessionStorage.getItem('vetwise_id_token');
  const refreshToken = sessionStorage.getItem('vetwise_refresh_token');
  if (!accessToken || !idToken) return null;
  return { accessToken, idToken, refreshToken: refreshToken ?? '', expiresIn: 3600 };
}

export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  const session = getStoredSession();
  if (!session) return null;
  const claims = decodeJwt(session.idToken);
  if (!claims) return null;
  return {
    sub: claims['sub'] as string,
    role: (claims['custom:role'] as Role) ?? 'client',
    email: claims['email'] as string | undefined,
    phone: claims['phone_number'] as string | undefined,
    name: claims['name'] as string | undefined,
    approvalStatus: claims['custom:approvalStatus'] as string | undefined,
  };
}
