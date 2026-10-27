# Secure Offline Clinical Synchronization

## Architecture

```
ONLINE
  ↓ Securely cache permitted context
NETWORK UNAVAILABLE
  ↓ Controlled offline clinical entry
  ↓ Local protected pending queue (localStorage)
NETWORK RESTORED
  ↓ Authentication check
  ↓ Version/conflict detection
  ↓ Synchronize
  ↓ Server acknowledgement
  ↓ Audit event
```

## Implementation

Defined in `src/lib/offline-sync.ts`. Uses browser `localStorage` for the pending queue.

### Key Functions

- `offlineSync.saveRecord()` — Save a clinical record locally
- `offlineSync.getQueue()` — Get all offline records
- `offlineSync.getPendingRecords()` — Get records awaiting sync
- `offlineSync.getConflicts()` — Get records with sync conflicts
- `offlineSync.getSummary()` — Get counts by sync status
- `offlineSync.markSyncing/Synced/Conflict/Failed()` — Update sync status
- `offlineSync.resolveConflict()` — Resolve a conflict (use_local, use_server, merge)
- `offlineSync.cacheContext()` — Cache permitted clinical context for offline use
- `offlineSync.detectConflict()` — Detect field-level conflicts between local and server versions

### Sync Status States

| Status | Label | Description |
|--------|-------|-------------|
| saved_locally | Saved locally | Record saved in browser, not yet queued for sync |
| pending_sync | Pending sync | Record queued, waiting for network |
| syncing | Syncing... | Record being transmitted to server |
| synced | Synced | Server confirmed acceptance |
| conflict | Conflict | Server version differs from local |
| sync_failed | Sync failed | Sync attempt failed, will retry |

## Critical Rule

**The server has NOT accepted an offline change until confirmation.** The UI always shows the sync status. Records marked "saved_locally" or "pending_sync" are NOT confirmed by the server.

## UI

The OfflineSyncPanel component (`src/components/OfflineSyncPanel.tsx`) shows:
- Online/offline indicator
- Summary counts (pending, syncing, synced, conflicts, failed)
- Sync Now button (enabled when online)
- Queue of all offline records with sync status
- Conflict resolution UI (use local / use server / merge)
- Offline notice when disconnected

## Limitations

1. **Encryption**: localStorage stores data unencrypted. On native mobile (Capacitor), secure storage should be used instead. This is a known limitation of the web implementation.
2. **Storage size**: localStorage has a ~5MB limit. For larger offline datasets, IndexedDB should be used.
3. **Authentication**: Re-authentication is required after network restoration before sync can proceed.
4. **Duplicate prevention**: Each offline record has a unique localId to prevent duplicate submissions.

## Missing Backend Capabilities

1. **POST /sync/batch** — Batch sync endpoint that accepts multiple records, performs conflict detection, and returns per-record results
2. **GET /sync/version/:recordId** — Fetch server version for conflict detection
