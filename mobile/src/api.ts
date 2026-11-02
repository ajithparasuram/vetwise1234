import Constants from 'expo-constants';
import { getSession } from './storage';
import type { AuthUser, Role, Session } from './types';

const baseUrl = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'https://7fcg51215k.execute-api.us-east-1.amazonaws.com/staging';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function authedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = await getSession();
  const token = session?.accessToken;
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

async function unauthedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
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

export type Pet = {
  petId: string;
  name: string;
  species: string;
  breed: string;
  color?: string;
  sex?: string;
  age?: string;
  weight?: string;
  ownerId: string;
  photoKey?: string;
  videoKey?: string;
  visits?: number;
  lastVisit?: string;
  createdAt: string;
  updatedAt: string;
};

export type Appointment = {
  appointmentId: string;
  time: string;
  date: string;
  petId: string;
  ownerId: string;
  doctorId: string;
  reason?: string;
  visitType?: string;
  location?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ClinicalRecord = {
  recordId: string;
  petId: string;
  ownerId: string;
  doctorId: string;
  appointmentId?: string;
  date: string;
  reason?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  followup?: string;
  createdAt: string;
  updatedAt: string;
};

export type Prescription = {
  rxId: string;
  petId: string;
  ownerId: string;
  doctorId: string;
  appointmentId?: string;
  date: string;
  meds: string;
  instructions?: string;
  status: 'draft' | 'finalized';
  pdfKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationItem = {
  notificationId: string;
  recipientId: string;
  recipientType?: string;
  eventType?: string;
  channel?: string;
  resourceId?: string;
  status?: string;
  createdAt: string;
};

export type Plan = {
  planId: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: string;
  duration?: string;
  benefits: string[];
  taxTreatment?: string;
};

export type SettingsResponse = {
  brand: { name: string; company: string; supportEmail: string };
  plans: Plan[];
  serviceAreas: { areaId: string; name: string; type: string; serviceTypes: string[] }[];
  features: Record<string, boolean>;
  booking: { minAdvanceHours: number; maxAdvanceDays: number; cancellationWindowHours: number };
};

export type Subscription = {
  subscriptionId: string;
  ownerId: string;
  planId: string;
  razorpaySubscriptionId?: string;
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: string;
  benefits: string[];
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  paymentId: string;
  ownerId: string;
  appointmentId?: string;
  subscriptionId?: string;
  service: string;
  amount: number;
  currency: string;
  method?: string;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignatureVerified?: boolean;
  refund?: { amount: number; status: string; initiatedAt: string; reason?: string };
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentId: string;
};

export type VerifyPaymentResponse = { verified: boolean; paymentId: string };

export type Device = {
  deviceId: string;
  userId: string;
  fcmToken: string;
  platform: string;
  appVersion?: string;
  createdAt: string;
  updatedAt: string;
};

export const api = {
  // Auth (unauthed)
  sendOtp: (phone: string, purpose: 'login' | 'register') => unauthedRequest<{ otpId: string; expiresAt: string }>('/auth/whatsapp-otp', { method: 'POST', body: JSON.stringify({ phone: formatPhone(phone), purpose }) }),
  verifyOtp: (body: { otpId: string; code: string; phone: string; purpose: 'login' | 'register'; registrationData?: { name: string; email: string; role: Role } }) => unauthedRequest<Session & { cognitoSub?: string; role: Role; approvalStatus: string }>('/auth/whatsapp-otp/verify', { method: 'PUT', body: JSON.stringify({ ...body, phone: formatPhone(body.phone) }) }),
  passwordLogin: (identifier: string, password: string) => unauthedRequest<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  refresh: (refreshToken: string) => unauthedRequest<Session>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  // Pets
  getPets: () => authedRequest<Pet[]>('/patients'),
  createPet: (body: Partial<Pet>) => authedRequest<Pet>('/patients', { method: 'POST', body: JSON.stringify(body) }),
  updatePet: (id: string, body: Partial<Pet>) => authedRequest<Pet>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Appointments
  getAppointments: () => authedRequest<Appointment[]>('/appointments'),
  createAppointment: (body: Partial<Appointment>) => authedRequest<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(body) }),
  updateAppointment: (id: string, body: Partial<Appointment>) => authedRequest<Appointment>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Clinical records
  getClinicalRecords: (petId?: string) => authedRequest<ClinicalRecord[]>(`/clinical-records${petId ? `?petId=${petId}` : ''}`),
  createClinicalRecord: (body: Partial<ClinicalRecord>) => authedRequest<ClinicalRecord>('/clinical-records', { method: 'POST', body: JSON.stringify(body) }),

  // Prescriptions
  getPrescriptions: (petId?: string) => authedRequest<Prescription[]>(`/prescriptions${petId ? `?petId=${petId}` : ''}`),
  createPrescription: (body: Partial<Prescription>) => authedRequest<Prescription>('/prescriptions', { method: 'POST', body: JSON.stringify(body) }),
  getPrescription: (id: string) => authedRequest<Prescription>(`/prescriptions/${id}`),
  finalizePrescription: (id: string) => authedRequest<Prescription>(`/prescriptions/${id}/finalize`, { method: 'POST' }),
  getPrescriptionPdf: (id: string) => authedRequest<{ url: string; expiresIn: number }>(`/prescriptions/${id}/pdf`),

  // Notifications
  getNotifications: () => authedRequest<NotificationItem[]>('/notifications'),

  // Settings (plans, service areas, features)
  getSettings: () => authedRequest<SettingsResponse>('/settings'),

  // Subscriptions
  getSubscriptions: () => authedRequest<Subscription[]>('/subscriptions'),
  createSubscription: (planId: string, ownerId?: string) => authedRequest<Subscription>('/subscriptions', { method: 'POST', body: JSON.stringify({ planId, ownerId }) }),
  getSubscription: (id: string) => authedRequest<Subscription>(`/subscriptions/${id}`),
  cancelSubscription: (id: string) => authedRequest<Subscription>(`/subscriptions/${id}/cancel`, { method: 'POST' }),

  // Payments
  getPayments: () => authedRequest<Payment[]>('/payments'),
  getPayment: (id: string) => authedRequest<Payment>(`/payments/${id}`),
  createOrder: (resourceType: 'plan' | 'appointment', resourceId: string) => authedRequest<CreateOrderResponse>('/payments/orders', { method: 'POST', body: JSON.stringify({ resourceType, resourceId }) }),
  verifyPayment: (body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; paymentId: string; method?: string }) => authedRequest<VerifyPaymentResponse>('/payments/verify', { method: 'POST', body: JSON.stringify(body) }),

  // Devices (FCM push notification token registration)
  registerDevice: (fcmToken: string, platform: string, appVersion?: string) => authedRequest<Device>('/devices', { method: 'POST', body: JSON.stringify({ fcmToken, platform, appVersion }) }),
  getDevices: () => authedRequest<Device[]>('/devices'),
  removeDevice: (tokenId: string) => authedRequest<{ removed: boolean }>(`/devices/${tokenId}`, { method: 'DELETE' }),
};

export function decodeUser(idToken: string): AuthUser | null {
  try {
    const payload = idToken.split('.')[1];
    const claims = JSON.parse(globalThis.atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
    return { sub: String(claims.sub), role: (claims['custom:role'] as Role) ?? 'client', email: String(claims.email ?? ''), phone: String(claims.phone_number ?? ''), name: String(claims.name ?? ''), approvalStatus: String(claims['custom:approvalStatus'] ?? 'active') };
  } catch { return null; }
}
