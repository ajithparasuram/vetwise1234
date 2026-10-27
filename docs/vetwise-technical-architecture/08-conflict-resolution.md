# Conflict Resolution

## Concept

When offline records are synchronized, the server version may differ from the local version. The system does NOT silently overwrite either version.

## ConflictDetail Structure

- field — the conflicting field name
- localValue — the value stored locally
- serverValue — the value on the server
- localTimestamp — when the local value was last updated
- serverTimestamp — when the server value was last updated
- recordId — the patient/record identifier

## Conflict Detection

`offlineSync.detectConflict()` compares specified fields between local and server records. If any field differs, a ConflictDetail is created.

Example:
```
Local weight: 24.2 kg (updated 10:30 AM)
Server weight: 23.8 kg (updated 10:15 AM)
→ Conflict detected on "weight" field
```

## Resolution Options

1. **Use Local** — Keep the local value, discard server value
2. **Use Server** — Accept the server value, discard local value
3. **Merge** — Combine both versions (server fields as base, local overrides)

After resolution, the record is marked as `pending_sync` for re-transmission.

## Human Review

The system requires user confirmation for conflict resolution. It does not auto-resolve clinical conflicts. Medical judgment is left to the veterinarian.

## No Invented Clinical Rules

The system does not implement clinical conflict rules (e.g., "latest weight wins"). It presents both values with timestamps and lets the user decide.

## UI

The OfflineSyncPanel shows conflicts with:
- Field name
- Local value and timestamp
- Server value and timestamp
- Three resolution buttons (Use Local / Use Server / Merge)

## Missing Backend Capabilities

1. Server-side version tracking with `updated_at` timestamps
2. **POST /sync/resolve** — Submit conflict resolution to server
3. Optimistic locking with version numbers to prevent silent overwrites
