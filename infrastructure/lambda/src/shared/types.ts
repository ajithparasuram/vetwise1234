/**
 * Shared type definitions for VetWise Lambda handlers.
 * Matches frontend camelCase field names exactly.
 */

export type Role = 'client' | 'doctor' | 'admin' | 'frontdesk';
export type ApprovalStatus = 'pending' | 'active' | 'rejected';
export type ResourceType =
  | 'owner' | 'pet' | 'appointment' | 'clinicalRecord'
  | 'prescription' | 'payment' | 'subscription' | 'doctor'
  | 'notification' | 'plan' | 'organization' | 'serviceArea'
  | 'contactEnquiry' | 'auditLog';

export interface AuthContext {
  sub: string;
  role: Role;
  email?: string;
  phone?: string;
  name?: string;
  organizationId?: string;
  approvalStatus?: ApprovalStatus;
  ownerId?: string;
  doctorId?: string;
}

export interface ApiResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

export interface ApiError {
  error: string;
  message: string;
  requestId: string;
}

export interface Owner {
  ownerId: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  address: string;
  joinedDate: string;
  status: string;
  cognitoSub: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pet {
  petId: string;
  name: string;
  species: string;
  breed: string;
  color: string;
  sex: string;
  age: string;
  weight: string;
  ownerId: string;
  photoKey?: string;
  videoKey?: string;
  visits: number;
  lastVisit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  appointmentId: string;
  time: string;
  date: string;
  petId: string;
  ownerId: string;
  doctorId: string;
  reason: string;
  visitType: string;
  location: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalRecord {
  recordId: string;
  petId: string;
  ownerId: string;
  doctorId: string;
  appointmentId?: string;
  date: string;
  reason: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  followup?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  rxId: string;
  petId: string;
  ownerId: string;
  doctorId: string;
  appointmentId?: string;
  date: string;
  meds: string;
  instructions: string;
  status: 'draft' | 'finalized';
  pdfKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  paymentId: string;
  ownerId: string;
  appointmentId?: string;
  subscriptionId?: string;
  service: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignatureVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
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
}

export interface Doctor {
  doctorId: string;
  cognitoSub: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  license: string;
  experience: string;
  clinic: string;
  organizationId: string;
  approvalStatus: ApprovalStatus;
  appliedDate: string;
  joinedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  planId: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: string;
  duration: string;
  benefits: string[];
  taxTreatment: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  notificationId: string;
  recipientId: string;
  recipientType: string;
  eventType: string;
  channel: string;
  resourceId: string;
  status: string;
  attempts: number;
  dedupeKey: string;
  providerMessageId?: string;
  createdAt: string;
  sentAt?: string;
  failedAt?: string;
}

export interface AuditLog {
  auditId: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export interface ServiceArea {
  areaId: string;
  name: string;
  type: string;
  active: boolean;
  coverageGeometry: {
    centerLat: number;
    centerLng: number;
    radiusKm: number;
  };
  serviceTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactEnquiry {
  enquiryId: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  createdAt: string;
}
