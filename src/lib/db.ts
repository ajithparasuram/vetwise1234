/**
 * VetWise data access layer.
 *
 * Wraps the AWS API client (src/lib/api.ts). No Supabase.
 * Returns null on failure — callers must handle error states.
 */

import { api } from './api';

export interface ClientRecord {
  ownerId: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  joinedDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientRecord {
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

export interface ClientLocation {
  id: string;
  clientId: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  isPrimary: boolean;
}

export interface BreedingRecord {
  id: string;
  patientId: string;
  partnerDetails: string;
  breedingDate: string;
  expectedDate: string;
  breedingOutcome: string;
  notes: string;
  status: string;
  createdAt: string;
}

export const db = {
  async getClients(): Promise<ClientRecord[] | null> {
    try { return await api.getClients() as ClientRecord[]; }
    catch (e) { console.warn('[VetWise] getClients:', e); return null; }
  },

  async getClientById(id: string): Promise<ClientRecord | null> {
    try {
      const all = await api.getClients() as ClientRecord[];
      return all?.find((c) => c.ownerId === id) ?? null;
    } catch { return null; }
  },

  async createClient(body: Partial<ClientRecord>): Promise<ClientRecord | null> {
    try { return await api.createClient(body) as ClientRecord; }
    catch (e) { console.warn('[VetWise] createClient:', e); return null; }
  },

  async updateClient(id: string, body: Partial<ClientRecord>): Promise<ClientRecord | null> {
    try { return await api.updateClient(id, body) as ClientRecord; }
    catch (e) { console.warn('[VetWise] updateClient:', e); return null; }
  },

  async getPatients(): Promise<PatientRecord[] | null> {
    try { return await api.getPatients() as PatientRecord[]; }
    catch (e) { console.warn('[VetWise] getPatients:', e); return null; }
  },

  async getPatientsByClient(ownerId: string): Promise<PatientRecord[] | null> {
    try {
      const all = await api.getPatients() as PatientRecord[];
      return all?.filter((p) => p.ownerId === ownerId) ?? [];
    } catch { return null; }
  },

  async getPatientById(patientId: string): Promise<PatientRecord | null> {
    try {
      const all = await api.getPatients() as PatientRecord[];
      return all?.find((p) => p.petId === patientId) ?? null;
    } catch { return null; }
  },

  async createPatient(body: Partial<PatientRecord>): Promise<PatientRecord | null> {
    try { return await api.createPatient(body) as PatientRecord; }
    catch (e) { console.warn('[VetWise] createPatient:', e); return null; }
  },

  async updatePatient(patientId: string, body: Partial<PatientRecord>): Promise<PatientRecord | null> {
    try { return await api.updatePatient(patientId, body) as PatientRecord; }
    catch (e) { console.warn('[VetWise] updatePatient:', e); return null; }
  },

  async getBreedingRecords(_patientId: string): Promise<BreedingRecord[] | null> {
    return [];
  },

  async createBreedingRecord(_body: Partial<BreedingRecord>): Promise<BreedingRecord | null> {
    return null;
  },

  async getLocations(_clientId: string): Promise<ClientLocation[] | null> {
    return [];
  },

  async createLocation(_body: Partial<ClientLocation>): Promise<ClientLocation | null> {
    return null;
  },

  async deleteLocation(_id: string): Promise<boolean> {
    return false;
  },

  async uploadPatientMedia(_patientId: string, _fileType: string, _file: File): Promise<string | null> {
    return null;
  },

  async getMediaUrl(_storageKey: string): Promise<string | null> {
    return null;
  },

  async searchPatients(query: string): Promise<PatientRecord[] | null> {
    try {
      const all = await api.getPatients() as PatientRecord[];
      if (!all) return null;
      const q = query.toLowerCase();
      return all.filter((p) =>
        `${p.name ?? ''} ${p.species ?? ''} ${p.breed ?? ''} ${p.petId ?? ''}`.toLowerCase().includes(q)
      );
    } catch { return null; }
  },

  async logAction(_actionType: string, _entityType: string, _entityId: string, _details?: Record<string, unknown>): Promise<void> {
  },
};
