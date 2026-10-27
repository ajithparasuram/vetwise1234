/**
 * VetWise API data access — wraps src/lib/api.ts.
 * Returns { data, error } for compatibility with existing call sites.
 */

import { api } from './api';

interface QueryResult<T> { data: T | null; error: string | null; }

async function wrap<T>(fn: () => Promise<T>): Promise<QueryResult<T>> {
  try { return { data: await fn(), error: null }; }
  catch (e) { return { data: null, error: e instanceof Error ? e.message : 'Request failed' }; }
}

// ---- Clients ----

export async function fetchClients() { return wrap(() => api.getClients()); }

export async function fetchClientById(clientId: string) {
  return wrap(async () => {
    const all = await api.getClients() as any[];
    return all?.find((c) => c.ownerId === clientId) ?? null;
  });
}

export async function fetchClientsByUser(userId: string) {
  return wrap(async () => {
    const all = await api.getClients() as any[];
    return all?.filter((c) => c.ownerId === userId || c.cognitoSub === userId) ?? [];
  });
}

// ---- Patients ----

export async function fetchPatients() { return wrap(() => api.getPatients()); }

export async function fetchPatientsByClient(ownerId: string) {
  return wrap(async () => {
    const all = await api.getPatients() as any[];
    return all?.filter((p) => p.ownerId === ownerId) ?? [];
  });
}

export async function fetchPatientsByUser(cognitoSub: string) {
  return wrap(() => api.getPatients() as Promise<any[]>);
}

export async function fetchPatientById(patientId: string) {
  return wrap(async () => {
    const all = await api.getPatients() as any[];
    return all?.find((p) => p.petId === patientId) ?? null;
  });
}

// ---- Comprehensive Search ----

export interface SearchResult {
  patientId: string;
  name: string;
  species: string;
  customSpecies: string | null;
  breed: string | null;
  sex: string | null;
  age: string | null;
  color: string | null;
  weight: string | null;
  clientId: string;
  clientName: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  status: string;
  lastVisit: string;
  visits: number;
}

export interface ClientSearchResult {
  clientId: string;
  clientName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  address: string;
  status: string;
  pets: SearchResult[];
}

export async function searchPatientsAndClients(
  query: string,
  speciesFilter: string,
): Promise<QueryResult<{ patients: SearchResult[]; clients: ClientSearchResult[] }>> {
  try {
    const [patRes, cliRes] = await Promise.all([fetchPatients(), fetchClients()]);
    if (patRes.error || !patRes.data) {
      return { data: null, error: patRes.error ?? 'The server did not return patient records.' };
    }
    const clients = (cliRes.data ?? []) as any[];
    const patients = patRes.data as any[];

    const q = query.trim().toLowerCase();

    const allResults: SearchResult[] = patients.map((p) => {
      const c = clients.find((cl) => cl.ownerId === p.ownerId);
      return {
        patientId: p.petId ?? p.patientId ?? '',
        name: p.name ?? '',
        species: p.species ?? '',
        customSpecies: p.customSpecies ?? null,
        breed: p.breed ?? null,
        sex: p.sex ?? null,
        age: p.age ?? null,
        color: p.color ?? null,
        weight: p.weight ?? null,
        clientId: p.ownerId ?? '',
        clientName: c?.name ?? '',
        city: c?.city ?? '',
        state: c?.state ?? '',
        phone: c?.phone ?? '',
        email: c?.email ?? '',
        status: c?.status ?? p.status ?? 'Active',
        lastVisit: p.lastVisit ?? 'No visits yet',
        visits: p.visits ?? 0,
      };
    });

    let filtered = allResults;
    if (q) {
      filtered = filtered.filter((r) =>
        r.patientId.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.breed ?? '').toLowerCase().includes(q) ||
        r.species.toLowerCase().includes(q) ||
        (r.customSpecies ?? '').toLowerCase().includes(q) ||
        r.clientId.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        r.phone.toLowerCase().includes(q),
      );
    }
    if (speciesFilter) {
      filtered = filtered.filter((r) => r.species === speciesFilter);
    }

    // Build client results for queries that match a client
    let clientResults: ClientSearchResult[] = [];
    if (q) {
      const matchedClientIds = new Set<string>();
      clients.forEach((c) => {
        const cid = c.ownerId ?? c.clientId ?? '';
        const cname = c.name ?? '';
        const cphone = c.phone ?? '';
        if (
          cid.toLowerCase().includes(q) ||
          cname.toLowerCase().includes(q) ||
          cphone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          cphone.toLowerCase().includes(q)
        ) {
          matchedClientIds.add(cid);
        }
      });
      clientResults = Array.from(matchedClientIds).map((cid) => {
        const c = clients.find((cl) => (cl.ownerId ?? cl.clientId) === cid);
        const pets = allResults.filter((r) => r.clientId === cid);
        return {
          clientId: cid,
          clientName: c?.name ?? '',
          phone: c?.phone ?? '',
          email: c?.email ?? '',
          city: c?.city ?? '',
          state: c?.state ?? '',
          address: c?.address ?? '',
          status: c?.status ?? 'Active',
          pets,
        };
      });
    }

    return { data: { patients: filtered, clients: clientResults }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Search failed' };
  }
}

// ---- Appointments ----

export async function fetchAppointments() { return wrap(() => api.getAppointments()); }

export async function fetchAppointmentsByClient(ownerId: string) {
  return wrap(async () => {
    const all = await api.getAppointments() as any[];
    return all?.filter((a) => a.ownerId === ownerId) ?? [];
  });
}

// ---- Clinical Records ----

export async function fetchClinicalRecords() { return wrap(() => api.getClinicalRecords()); }

export async function fetchClinicalRecordsByPatient(petId: string) {
  return wrap(() => api.getClinicalRecords(petId));
}

// ---- Prescriptions ----

export async function fetchPrescriptions() { return wrap(() => api.getPrescriptions()); }

export async function fetchPrescriptionsByClient(ownerId: string) {
  return wrap(async () => {
    const all = await api.getPrescriptions() as any[];
    return all?.filter((r) => r.ownerId === ownerId) ?? [];
  });
}

export async function fetchAppointmentsByPatient(petId: string) {
  return wrap(async () => {
    const all = await api.getAppointments() as any[];
    return all?.filter((a) => a.petId === petId || a.patientId === petId) ?? [];
  });
}

export async function fetchPaymentsByPatient(petId: string) {
  return wrap(async () => {
    const all = await api.getPayments() as any[];
    return all?.filter((p) => p.petId === petId || p.patientId === petId) ?? [];
  });
}

// ---- Weight Records ----

export async function fetchWeightRecords(patientId: string) {
  return wrap(async () => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/weight_records?patient_id=eq.${patientId}&order=recorded_date.asc`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!res.ok) throw new Error('Failed to fetch weight records');
    return await res.json() as any[];
  });
}

export async function insertWeightRecord(body: {
  patientId: string;
  weightValue: number;
  weightUnit: string;
  recordedDate: string;
  notes?: string;
}) {
  return wrap(async () => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/weight_records`,
      {
        method: 'POST',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          patient_id: body.patientId,
          weight_value: body.weightValue,
          weight_unit: body.weightUnit,
          recorded_date: body.recordedDate,
          notes: body.notes ?? null,
        }),
      },
    );
    if (!res.ok) throw new Error('Failed to save weight record');
    return await res.json();
  });
}

// ---- Patient Photos (Supabase Storage) ----

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PHOTO_BUCKET = 'patient-photos';

export interface PatientPhoto {
  id: string;
  patientId: string;
  fileName: string;
  contentType: string;
  uploadedAt: string;
  url: string;
}

export async function fetchPatientPhotos(patientId: string): Promise<QueryResult<PatientPhoto[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/patient_media?patient_id=eq.${patientId}&order=uploaded_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch photos');
    const rows = await res.json() as any[];
    return rows.map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      fileName: r.caption ?? r.storage_key?.split('/').pop() ?? 'photo',
      contentType: r.content_type ?? 'image/jpeg',
      uploadedAt: r.uploaded_at,
      url: `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${r.storage_key}`,
    }));
  });
}

export async function uploadPatientPhoto(
  patientId: string,
  file: File,
  mediaType: string,
): Promise<QueryResult<PatientPhoto>> {
  return wrap(async () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) throw new Error('Only JPEG, PNG, and WebP images are supported');
    if (file.size > 10 * 1024 * 1024) throw new Error('File size must be under 10MB');

    const ext = file.name.split('.').pop() ?? 'jpg';
    const storageKey = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${storageKey}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': file.type,
        },
        body: file,
      },
    );
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed: ${errText.slice(0, 200)}`);
    }

    const mediaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patient_media`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          patient_id: patientId,
          media_type: mediaType,
          storage_key: storageKey,
          content_type: file.type,
          file_size: file.size,
          caption: file.name,
        }),
      },
    );
    if (!mediaRes.ok) throw new Error('Failed to save photo metadata');
    const row = (await mediaRes.json() as any[])[0];
    return {
      id: row.id,
      patientId,
      fileName: file.name,
      contentType: file.type,
      uploadedAt: row.uploaded_at,
      url: `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${storageKey}`,
    };
  });
}

export async function deletePatientPhoto(photoId: string, storageKey: string): Promise<QueryResult<boolean>> {
  return wrap(async () => {
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patient_media?id=eq.${photoId}`,
      {
        method: 'DELETE',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      },
    );
    if (!delRes.ok) throw new Error('Failed to delete photo record');
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${storageKey}`,
      {
        method: 'DELETE',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      },
    );
    return true;
  });
}

// ---- Appointment Media (photos & videos uploaded during booking) ----

export interface AppointmentMedia {
  id: string;
  appointmentId: string;
  patientId: string;
  mediaType: 'photo' | 'video';
  fileName: string;
  contentType: string;
  uploadedAt: string;
  url: string;
}

export async function fetchAppointmentMedia(appointmentId: string): Promise<QueryResult<AppointmentMedia[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/appointment_media?appointment_id=eq.${appointmentId}&order=uploaded_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch appointment media');
    const rows = await res.json() as any[];
    return rows.map((r) => ({
      id: r.id,
      appointmentId: r.appointment_id,
      patientId: r.patient_id,
      mediaType: r.media_type === 'video' ? 'video' : 'photo',
      fileName: r.caption ?? r.storage_key?.split('/')?.pop() ?? 'media',
      contentType: r.content_type ?? 'image/jpeg',
      uploadedAt: r.uploaded_at,
      url: `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${r.storage_key}`,
    }));
  });
}

export async function uploadAppointmentMedia(
  appointmentId: string,
  patientId: string,
  clientId: string,
  file: File,
  mediaType: 'photo' | 'video',
): Promise<QueryResult<AppointmentMedia>> {
  return wrap(async () => {
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);
    if (!isImage && !isVideo) throw new Error('Only JPEG, PNG, WebP images and MP4, WebM videos are supported');
    if (file.size > 50 * 1024 * 1024) throw new Error('File size must be under 50MB');

    const ext = file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg');
    const storageKey = `appointments/${appointmentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${storageKey}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': file.type,
        },
        body: file,
      },
    );
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed: ${errText.slice(0, 200)}`);
    }

    const mediaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/appointment_media`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          patient_id: patientId,
          client_id: clientId,
          media_type: mediaType,
          storage_key: storageKey,
          content_type: file.type,
          file_size: file.size,
          caption: file.name,
        }),
      },
    );
    if (!mediaRes.ok) throw new Error('Failed to save media metadata');
    const row = (await mediaRes.json() as any[])[0];
    return {
      id: row.id,
      appointmentId,
      patientId,
      mediaType,
      fileName: file.name,
      contentType: file.type,
      uploadedAt: row.uploaded_at,
      url: `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${storageKey}`,
    };
  });
}

// ---- Invoices ----

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export async function fetchInvoicesByPatient(patientId: string): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?patient_id=eq.${patientId}&order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return await res.json() as any[];
  });
}

export async function fetchInvoicesByClient(clientId: string): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?client_id=eq.${clientId}&order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return await res.json() as any[];
  });
}

export async function createInvoice(body: {
  clientId: string;
  patientId?: string;
  appointmentId?: string;
  lineItems: InvoiceLineItem[];
  discount?: number;
  status: string;
  dueDate?: string;
  notes?: string;
}): Promise<QueryResult<any>> {
  return wrap(async () => {
    const subtotal = body.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    const taxAmount = body.lineItems.reduce((sum, li) => sum + (li.quantity * li.unitPrice * li.taxPercent / 100), 0);
    const total = subtotal + taxAmount - (body.discount ?? 0);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          client_id: body.clientId,
          patient_id: body.patientId ?? null,
          appointment_id: body.appointmentId ?? null,
          line_items: body.lineItems,
          subtotal,
          tax_amount: taxAmount,
          discount: body.discount ?? 0,
          total,
          paid_amount: 0,
          status: body.status,
          due_date: body.dueDate ?? null,
          notes: body.notes ?? null,
        }),
      },
    );
    if (!res.ok) throw new Error('Failed to create invoice');
    const rows = await res.json() as any[];
    return rows[0];
  });
}

export async function updateInvoiceStatus(invoiceId: string, status: string): Promise<QueryResult<any>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?invoice_id=eq.${invoiceId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ status }),
      },
    );
    if (!res.ok) throw new Error('Failed to update invoice');
    const rows = await res.json() as any[];
    return rows[0];
  });
}

export async function refundInvoice(invoiceId: string, amount: number, reason?: string): Promise<QueryResult<any>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?invoice_id=eq.${invoiceId}&select=paid_amount,refund_amount`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to load invoice for refund');
    const rows = await res.json() as any[];
    const inv = rows[0];
    if (!inv) throw new Error('Invoice not found');
    const paid = Number(inv.paid_amount ?? 0);
    const alreadyRefunded = Number(inv.refund_amount ?? 0);
    if (amount <= 0) throw new Error('Refund amount must be greater than zero');
    if (amount > paid - alreadyRefunded) throw new Error('Refund amount exceeds the refundable balance');

    const newRefundTotal = alreadyRefunded + amount;
    const fullyRefunded = newRefundTotal >= paid;
    const patch: Record<string, unknown> = {
      refund_amount: newRefundTotal,
      refunded_at: new Date().toISOString(),
    };
    if (reason) patch.refund_reason = reason;
    if (fullyRefunded) patch.status = 'refunded';

    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?invoice_id=eq.${invoiceId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(patch),
      },
    );
    if (!patchRes.ok) throw new Error('Failed to record refund');
    const updated = await patchRes.json() as any[];
    return updated[0];
  });
}

export async function fetchAllInvoices(): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return await res.json() as any[];
  });
}

export function downloadInvoicePdf(invoice: any, patientName: string, clientName: string): void {
  const lineItems = invoice.line_items ?? [];
  const subtotal = Number(invoice.subtotal ?? 0);
  const tax = Number(invoice.tax_amount ?? 0);
  const discount = Number(invoice.discount ?? 0);
  const total = Number(invoice.total ?? 0);
  const paid = Number(invoice.paid_amount ?? 0);
  const refunded = Number(invoice.refund_amount ?? 0);
  const outstanding = total - paid + refunded;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Invoice ${invoice.invoice_id ?? invoice.invoiceId ?? ''}</title>
  <style>
    body{font-family:'DM Sans',Arial,sans-serif;color:#14203b;padding:32px;max-width:780px;margin:auto}
    h1{font-family:'Manrope',Arial,sans-serif;color:#112b73;margin:0 0 4px}
    .muted{color:#73809a;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #112b73;padding-bottom:16px;margin-bottom:20px}
    .parties{display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px}
    .parties label{display:block;color:#8290a9;font-size:10px;font-weight:700;letter-spacing:.5px;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{text-align:left;background:#fbfcfd;color:#8290a5;font-size:10px;letter-spacing:.5px;padding:10px;border-bottom:1px solid #eef1f5}
    td{padding:10px;border-bottom:1px solid #eef1f5;font-size:13px}
    .right{text-align:right}
    .totals{width:300px;margin-left:auto;font-size:13px}
    .totals div{display:flex;justify-content:space-between;padding:6px 0}
    .totals .grand{border-top:2px solid #112b73;font-weight:700;font-size:15px;padding-top:10px;margin-top:4px}
    .badge{display:inline-block;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase}
    .status-paid{background:#ebfff4;color:#079653;border:1px solid #b8efd2}
    .status-issued{background:#edf5ff;color:#3575da;border:1px solid #c7ddff}
    .status-refunded{background:#fff0f0;color:#e73535;border:1px solid #ffc7c7}
    .status-draft{background:#f2f4f7;color:#8290a5;border:1px solid #e0e5ec}
    @media print{body{padding:14px}}
  </style></head><body>
  <div class="head">
    <div><h1>VetWise</h1><p class="muted">Invoice ${invoice.invoice_id ?? invoice.invoiceId ?? ''}</p></div>
    <div style="text-align:right">
      <p class="muted">${invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-IN') : ''}</p>
      <p class="muted">Due: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '—'}</p>
      <span class="badge status-${(invoice.status ?? 'draft').toLowerCase()}">${(invoice.status ?? 'DRAFT').toUpperCase()}</span>
    </div>
  </div>
  <div class="parties">
    <div><label>BILLED TO</label><strong>${clientName}</strong></div>
    <div style="text-align:right"><label>PATIENT</label><strong>${patientName}</strong></div>
  </div>
  <table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Tax%</th><th class="right">Amount</th></tr></thead>
  <tbody>${lineItems.map((li: any) => {
    const amt = (Number(li.quantity ?? 0)) * (Number(li.unitPrice ?? 0));
    return `<tr><td>${li.description ?? ''}</td><td class="right">${li.quantity ?? 0}</td><td class="right">₹${Number(li.unitPrice ?? 0).toFixed(2)}</td><td class="right">${li.taxPercent ?? 0}%</td><td class="right">₹${amt.toFixed(2)}</td></tr>`;
  }).join('')}</tbody></table>
  <div class="totals">
    <div><span>Subtotal</span><strong>₹${subtotal.toFixed(2)}</strong></div>
    <div><span>Tax</span><strong>₹${tax.toFixed(2)}</strong></div>
    ${discount > 0 ? `<div><span>Discount</span><strong>-₹${discount.toFixed(2)}</strong></div>` : ''}
    <div class="grand"><span>Total</span><strong>₹${total.toFixed(2)}</strong></div>
    ${paid > 0 ? `<div><span>Paid</span><strong style="color:#0b9b55">₹${paid.toFixed(2)}</strong></div>` : ''}
    ${refunded > 0 ? `<div><span>Refunded</span><strong style="color:#e73535">-₹${refunded.toFixed(2)}</strong></div>` : ''}
    <div class="grand"><span>Outstanding</span><strong>₹${outstanding.toFixed(2)}</strong></div>
  </div>
  ${invoice.notes ? `<p class="muted" style="margin-top:20px"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
  ${invoice.refund_reason ? `<p class="muted" style="margin-top:8px"><strong>Refund reason:</strong> ${invoice.refund_reason}</p>` : ''}
  <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  win.document.close();
}

// ---- Payments ----

export async function fetchPayments() { return wrap(() => api.getPayments()); }

export async function fetchPaymentsByClient(ownerId: string) {
  return wrap(async () => {
    const all = await api.getPayments() as any[];
    return all?.filter((p) => p.ownerId === ownerId) ?? [];
  });
}

// ---- Subscriptions ----

export async function fetchSubscriptions() { return wrap(() => api.getSubscriptions()); }

export async function fetchSubscriptionPlans() {
  return wrap(async () => {
    const settings = await api.getSettings();
    return settings.plans;
  });
}

// ---- Doctors ----

export async function fetchDoctors() { return wrap(() => api.getDoctors()); }

export async function fetchPendingDoctors() { return wrap(() => api.getPendingDoctors()); }

export async function fetchDoctorByProfile(profileId: string) {
  return wrap(async () => {
    const all = await api.getDoctors() as any[];
    return all?.find((d) => d.cognitoSub === profileId) ?? null;
  });
}

// ---- Notifications ----

export async function fetchNotifications(_userId?: string) { return wrap(() => api.getNotifications()); }

export async function insertNotification(_body: Record<string, unknown>) { return null; }
export async function markNotificationRead(_id: string) { return null; }
export async function markAllNotificationsRead(_userId: string) { return null; }

// ---- Mutations ----

export async function insertClient(body: Record<string, unknown>) { return wrap(() => api.createClient(body)); }
export async function updateClient(clientId: string, body: Record<string, unknown>) { return wrap(() => api.updateClient(clientId, body)); }
export async function insertPatient(body: Record<string, unknown>) { return wrap(() => api.createPatient(body)); }
export async function updatePatient(patientId: string, body: Record<string, unknown>) { return wrap(() => api.updatePatient(patientId, body)); }
export async function insertAppointment(body: Record<string, unknown>) { return wrap(() => api.createAppointment(body)); }
export async function updateAppointment(id: string, body: Record<string, unknown>) { return wrap(() => api.updateAppointment(id, body)); }
export async function insertClinicalRecord(body: Record<string, unknown>) { return wrap(() => api.createClinicalRecord(body)); }
export async function insertPrescription(body: Record<string, unknown>) { return wrap(() => api.createPrescription(body)); }
export async function approveDoctor(doctorId: string, _adminId: string) { return wrap(() => api.approveDoctor(doctorId)); }
export async function rejectDoctor(doctorId: string, _reason: string) { return wrap(() => api.rejectDoctor(doctorId)); }
export async function insertDoctor(body: Record<string, unknown>) { return wrap(() => api.createDoctor(body)); }

// ---- Prescriptions PDF ----

export async function fetchPrescriptionPdf(id: string) { return wrap(() => api.getPrescriptionPdf(id)); }
export async function finalizePrescription(id: string) { return wrap(() => api.finalizePrescription(id)); }

// ---- Laboratory Results ----

export async function fetchLabResultsByPatient(patientId: string): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lab_results?patient_id=eq.${patientId}&order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch lab results');
    return await res.json() as any[];
  });
}

export async function fetchLabResultsByClient(clientId: string): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lab_results?client_id=eq.${clientId}&order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch lab results');
    return await res.json() as any[];
  });
}

export async function insertLabResult(body: {
  patientId: string;
  clientId: string;
  testName: string;
  testCategory?: string;
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  status: string;
  collectedDate?: string;
  reportedDate?: string;
  performedBy?: string;
  notes?: string;
}): Promise<QueryResult<any>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lab_results`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          patient_id: body.patientId,
          client_id: body.clientId,
          test_name: body.testName,
          test_category: body.testCategory ?? null,
          result_value: body.resultValue ?? null,
          unit: body.unit ?? null,
          reference_range: body.referenceRange ?? null,
          status: body.status,
          collected_date: body.collectedDate ?? null,
          reported_date: body.reportedDate ?? null,
          performed_by: body.performedBy ?? null,
          notes: body.notes ?? null,
        }),
      },
    );
    if (!res.ok) throw new Error('Failed to create lab result');
    const rows = await res.json() as any[];
    return rows[0];
  });
}

export async function updateLabResult(id: string, body: Record<string, unknown>): Promise<QueryResult<any>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lab_results?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) throw new Error('Failed to update lab result');
    const rows = await res.json() as any[];
    return rows[0];
  });
}

// ---- Serviceability ----

export async function checkServiceability(lat: number, lng: number) {
  return wrap(() => api.checkServiceability(lat, lng));
}

// ---- Suppliers ----

export async function fetchSuppliers(): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/suppliers?order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    return await res.json() as any[];
  });
}

export async function insertSupplier(body: {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  status?: string;
  notes?: string;
}): Promise<QueryResult<any>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/suppliers`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          name: body.name,
          contact_person: body.contactPerson ?? null,
          email: body.email ?? null,
          phone: body.phone ?? null,
          address: body.address ?? null,
          gstin: body.gstin ?? null,
          status: body.status ?? 'active',
          notes: body.notes ?? null,
        }),
      },
    );
    if (!res.ok) throw new Error('Failed to create supplier');
    const rows = await res.json() as any[];
    return rows[0];
  });
}

export async function updateSupplier(id: string, body: Record<string, unknown>): Promise<QueryResult<any>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) throw new Error('Failed to update supplier');
    const rows = await res.json() as any[];
    return rows[0];
  });
}

// ---- Vaccinations ----

export async function fetchVaccinationsByPatient(patientId: string): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vaccinations?patient_id=eq.${patientId}&order=vaccination_date.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch vaccinations');
    return await res.json() as any[];
  });
}

export async function fetchVaccinationsByClient(clientId: string): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vaccinations?client_id=eq.${clientId}&order=vaccination_date.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch vaccinations');
    return await res.json() as any[];
  });
}

export async function insertVaccination(body: {
  patientId: string;
  clientId: string;
  vaccineName: string;
  vaccineCategory?: string;
  manufacturer?: string;
  batchNumber?: string;
  dosage?: string;
  route?: string;
  vaccinationDate: string;
  nextDueDate?: string;
  administeringVet?: string;
  status?: string;
  notes?: string;
}): Promise<QueryResult<any>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vaccinations`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          patient_id: body.patientId,
          client_id: body.clientId,
          vaccine_name: body.vaccineName,
          vaccine_category: body.vaccineCategory ?? null,
          manufacturer: body.manufacturer ?? null,
          batch_number: body.batchNumber ?? null,
          dosage: body.dosage ?? null,
          route: body.route ?? null,
          vaccination_date: body.vaccinationDate,
          next_due_date: body.nextDueDate ?? null,
          administering_vet: body.administeringVet ?? null,
          status: body.status ?? 'completed',
          notes: body.notes ?? null,
        }),
      },
    );
    if (!res.ok) throw new Error('Failed to create vaccination record');
    const rows = await res.json() as any[];
    return rows[0];
  });
}

// ---- Appointment Reminders ----

export async function fetchAppointmentReminders(): Promise<QueryResult<any[]>> {
  return wrap(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/appointment_reminders?order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch appointment reminders');
    return await res.json() as any[];
  });
}

export async function sendAppointmentReminder(body: {
  recipientEmail: string;
  recipientName?: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime?: string;
  appointmentType?: string;
  clientId?: string;
}): Promise<QueryResult<any>> {
  return wrap(async () => {
    const subject = `VetWise Appointment Reminder — ${body.patientName}`;
    const emailBody = `Dear ${body.recipientName ?? 'Client'},\n\nThis is a reminder for your upcoming appointment:\n\nPet: ${body.patientName}\nDate: ${body.appointmentDate}\n${body.appointmentTime ? `Time: ${body.appointmentTime}\n` : ''}${body.appointmentType ? `Type: ${body.appointmentType}\n` : ''}\nPlease arrive 10 minutes early.\n\n— VetWise Pet Care`;
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: 'appointment',
          recipientEmail: body.recipientEmail,
          recipientName: body.recipientName,
          subject,
          body: emailBody,
          clientId: body.clientId,
          patientName: body.patientName,
          appointmentDate: body.appointmentDate,
          appointmentTime: body.appointmentTime,
        }),
      },
    );
    if (!res.ok) throw new Error('Failed to send reminder');
    return await res.json();
  });
}

export async function sendPaymentReceipt(body: {
  recipientEmail: string;
  recipientName?: string;
  invoiceId: string;
  clientName: string;
  patientName: string;
  total: number;
  paid: number;
  refunded: number;
  status: string;
  clientId?: string;
}): Promise<QueryResult<any>> {
  return wrap(async () => {
    const outstanding = body.total - body.paid + body.refunded;
    const subject = `VetWise Payment Receipt — Invoice ${body.invoiceId}`;
    const emailBody = `Dear ${body.recipientName ?? body.clientName},\n\nThank you for your payment. Here is your receipt:\n\nInvoice: ${body.invoiceId}\nClient: ${body.clientName}\nPatient: ${body.patientName}\nTotal: ₹${body.total.toFixed(2)}\nPaid: ₹${body.paid.toFixed(2)}${body.refunded > 0 ? `\nRefunded: ₹${body.refunded.toFixed(2)}` : ''}\nOutstanding: ₹${outstanding.toFixed(2)}\nStatus: ${body.status.toUpperCase()}\n\n— VetWise Pet Care`;
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: 'payment',
          recipientEmail: body.recipientEmail,
          recipientName: body.recipientName,
          subject,
          body: emailBody,
          clientId: body.clientId,
        }),
      },
    );
    if (!res.ok) throw new Error('Failed to send receipt');
    return await res.json();
  });
}

// ---- Settings ----

export async function fetchSettings() { return wrap(() => api.getSettings()); }

// ---- Payments: order + verify ----

export async function createPaymentOrder(resourceType: string, resourceId: string) {
  return wrap(() => api.createOrder({ resourceType, resourceId }));
}

export async function verifyPayment(body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; paymentId: string }) {
  return wrap(() => api.verifyPayment(body));
}
