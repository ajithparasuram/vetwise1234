/**
 * VetWise Secure Offline Clinical Synchronization
 *
 * Architecture:
 * ONLINE → securely cache permitted context → NETWORK UNAVAILABLE →
 * controlled offline clinical entry → encrypted/local protected pending queue →
 * NETWORK RESTORED → authentication check → version/conflict detection →
 * synchronize → server acknowledgement → audit event
 *
 * The server has NOT accepted an offline change until confirmation.
 * Visible sync states: Saved locally | Pending sync | Syncing | Synced | Conflict | Sync failed
 */

import type { AuditEvent, ClinicalEncounter } from './orchestration';

export type SyncStatus = 'saved_locally' | 'pending_sync' | 'syncing' | 'synced' | 'conflict' | 'sync_failed';

export interface OfflineRecord {
  localId: string;
  recordType: 'clinical_record' | 'prescription' | 'clinical_encounter' | 'weight_entry' | 'vaccination_entry';
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  serverVersion: Record<string, unknown> | null;
  conflictDetail: ConflictDetail | null;
  retryCount: number;
}

export interface ConflictDetail {
  field: string;
  localValue: unknown;
  serverValue: unknown;
  localTimestamp: string;
  serverTimestamp: string;
  recordId: string;
}

export interface SyncQueueSummary {
  total: number;
  pending: number;
  syncing: number;
  synced: number;
  conflicts: number;
  failed: number;
}

const STORAGE_KEY = 'vetwise_offline_queue';
const CONTEXT_KEY = 'vetwise_offline_context';

function readQueue(): OfflineRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineRecord[];
  } catch {
    return [];
  }
}

function writeQueue(records: OfflineRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('[VetWise Offline] Failed to write queue:', e);
  }
}

function generateId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const offlineSync = {
  isOnline(): boolean {
    return navigator.onLine;
  },

  saveRecord(
    recordType: OfflineRecord['recordType'],
    payload: Record<string, unknown>,
  ): OfflineRecord {
    const queue = readQueue();
    const now = new Date().toISOString();
    const record: OfflineRecord = {
      localId: generateId(),
      recordType,
      payload,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'saved_locally',
      serverVersion: null,
      conflictDetail: null,
      retryCount: 0,
    };
    queue.push(record);
    writeQueue(queue);
    return record;
  },

  getQueue(): OfflineRecord[] {
    return readQueue();
  },

  getPendingRecords(): OfflineRecord[] {
    return readQueue().filter(
      (r) => r.syncStatus === 'saved_locally' || r.syncStatus === 'pending_sync' || r.syncStatus === 'sync_failed',
    );
  },

  getConflicts(): OfflineRecord[] {
    return readQueue().filter((r) => r.syncStatus === 'conflict');
  },

  getSummary(): SyncQueueSummary {
    const queue = readQueue();
    return {
      total: queue.length,
      pending: queue.filter((r) => r.syncStatus === 'saved_locally' || r.syncStatus === 'pending_sync').length,
      syncing: queue.filter((r) => r.syncStatus === 'syncing').length,
      synced: queue.filter((r) => r.syncStatus === 'synced').length,
      conflicts: queue.filter((r) => r.syncStatus === 'conflict').length,
      failed: queue.filter((r) => r.syncStatus === 'sync_failed').length,
    };
  },

  markSyncing(localId: string): void {
    const queue = readQueue();
    const r = queue.find((r) => r.localId === localId);
    if (r) {
      r.syncStatus = 'syncing';
      r.updatedAt = new Date().toISOString();
      writeQueue(queue);
    }
  },

  markSynced(localId: string): void {
    const queue = readQueue();
    const r = queue.find((r) => r.localId === localId);
    if (r) {
      r.syncStatus = 'synced';
      r.updatedAt = new Date().toISOString();
      writeQueue(queue);
    }
  },

  markConflict(localId: string, serverVersion: Record<string, unknown>, conflictDetail: ConflictDetail): void {
    const queue = readQueue();
    const r = queue.find((r) => r.localId === localId);
    if (r) {
      r.syncStatus = 'conflict';
      r.serverVersion = serverVersion;
      r.conflictDetail = conflictDetail;
      r.updatedAt = new Date().toISOString();
      writeQueue(queue);
    }
  },

  markFailed(localId: string): void {
    const queue = readQueue();
    const r = queue.find((r) => r.localId === localId);
    if (r) {
      r.syncStatus = 'sync_failed';
      r.retryCount += 1;
      r.updatedAt = new Date().toISOString();
      writeQueue(queue);
    }
  },

  resolveConflict(localId: string, resolution: 'use_local' | 'use_server' | 'merge'): void {
    const queue = readQueue();
    const r = queue.find((r) => r.localId === localId);
    if (!r || !r.conflictDetail) return;

    if (resolution === 'use_server' && r.serverVersion) {
      r.payload = { ...r.serverVersion };
    } else if (resolution === 'merge' && r.serverVersion) {
      r.payload = { ...r.serverVersion, ...r.payload, _merged: true };
    }
    // 'use_local' keeps payload as-is
    r.conflictDetail = null;
    r.syncStatus = 'pending_sync';
    r.updatedAt = new Date().toISOString();
    writeQueue(queue);
  },

  removeRecord(localId: string): void {
    const queue = readQueue().filter((r) => r.localId !== localId);
    writeQueue(queue);
  },

  clearSynced(): void {
    const queue = readQueue().filter((r) => r.syncStatus !== 'synced');
    writeQueue(queue);
  },

  cacheContext(patientId: string, context: Record<string, unknown>): void {
    try {
      const all = JSON.parse(localStorage.getItem(CONTEXT_KEY) ?? '{}');
      all[patientId] = { ...context, cachedAt: new Date().toISOString() };
      localStorage.setItem(CONTEXT_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('[VetWise Offline] Failed to cache context:', e);
    }
  },

  getCachedContext(patientId: string): Record<string, unknown> | null {
    try {
      const all = JSON.parse(localStorage.getItem(CONTEXT_KEY) ?? '{}');
      return all[patientId] ?? null;
    } catch {
      return null;
    }
  },

  getCachedPatientIds(): string[] {
    try {
      const all = JSON.parse(localStorage.getItem(CONTEXT_KEY) ?? '{}');
      return Object.keys(all);
    } catch {
      return [];
    }
  },

  detectConflict(
    localRecord: Record<string, unknown>,
    serverRecord: Record<string, unknown>,
    fields: string[],
  ): ConflictDetail | null {
    for (const field of fields) {
      const localVal = localRecord[field];
      const serverVal = serverRecord[field];
      if (localVal !== undefined && serverVal !== undefined && localVal !== serverVal) {
        return {
          field,
          localValue: localVal,
          serverValue: serverVal,
          localTimestamp: (localRecord.updatedAt as string) ?? (localRecord.createdAt as string) ?? '',
          serverTimestamp: (serverRecord.updatedAt as string) ?? '',
          recordId: (localRecord.patientId as string) ?? (serverRecord.patientId as string) ?? '',
        };
      }
    }
    return null;
  },
};

export function getSyncStatusLabel(status: SyncStatus): string {
  const labels: Record<SyncStatus, string> = {
    saved_locally: 'Saved locally',
    pending_sync: 'Pending sync',
    syncing: 'Syncing...',
    synced: 'Synced',
    conflict: 'Conflict',
    sync_failed: 'Sync failed',
  };
  return labels[status] ?? status;
}

export function getSyncStatusColor(status: SyncStatus): string {
  const colors: Record<SyncStatus, string> = {
    saved_locally: 'pending',
    pending_sync: 'pending',
    syncing: 'confirmed',
    synced: 'paid',
    conflict: 'overdue',
    sync_failed: 'overdue',
  };
  return colors[status] ?? 'pending';
}
