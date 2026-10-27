import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Check, Cloud, CloudOff, Plus, Trash2, FileText, Pill, Activity, Syringe, Weight } from 'lucide-react';
import {
  offlineSync, getSyncStatusLabel, getSyncStatusColor,
  type OfflineRecord,
} from '@/lib/offline-sync';

const RECORD_TYPE_ICONS: Record<string, typeof FileText> = {
  clinical_record: FileText,
  prescription: Pill,
  clinical_encounter: Activity,
  weight_entry: Weight,
  vaccination_entry: Syringe,
};

const DEMO_SEED_KEY = 'vetwise_offline_demo_seeded';

function seedDemoData() {
  if (localStorage.getItem(DEMO_SEED_KEY)) return;
  const now = Date.now();
  offlineSync.saveRecord('clinical_record', {
    patientId: 'VW-CL-000001-P01',
    patientName: 'Bruno',
    clientId: 'VW-CL-000001',
    diagnosis: 'Mild dermatitis — right flank',
    notes: 'Prescribed topical ointment. Follow-up in 7 days.',
    doctorId: 'demo_doctor',
    createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
  });
  offlineSync.saveRecord('prescription', {
    patientId: 'VW-CL-000001-P01',
    patientName: 'Bruno',
    medicine: 'Neosporin Topical Ointment',
    dosage: 'Apply twice daily on affected area',
    duration: '7 days',
    doctorId: 'demo_doctor',
    createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
  });
  offlineSync.saveRecord('weight_entry', {
    patientId: 'VW-CL-000001-P02',
    patientName: 'Whiskers',
    weight: '4.2 kg',
    recordedBy: 'demo_doctor',
    createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
  });
  const queue = offlineSync.getQueue();
  if (queue.length >= 3) {
    offlineSync.markConflict(queue[1].localId, { weight: '4.5 kg' }, {
      field: 'dosage',
      localValue: 'Apply twice daily on affected area',
      serverValue: 'Apply once daily on affected area',
      localTimestamp: new Date(now - 1000 * 60 * 20).toISOString(),
      serverTimestamp: new Date(now - 1000 * 60 * 25).toISOString(),
      recordId: 'VW-CL-000001-P01',
    });
  }
  localStorage.setItem(DEMO_SEED_KEY, '1');
}

export function OfflineSyncPanel() {
  const [queue, setQueue] = useState<OfflineRecord[]>([]);
  const [online, setOnline] = useState(offlineSync.isOnline());
  const [syncing, setSyncing] = useState(false);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecordType, setNewRecordType] = useState<OfflineRecord['recordType']>('clinical_record');
  const [newPatientName, setNewPatientName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const refresh = useCallback(() => {
    setQueue(offlineSync.getQueue());
    setOnline(offlineSync.isOnline());
  }, []);

  useEffect(() => {
    seedDemoData();
    refresh();
    const onOnline = () => { if (!simulatedOffline) { setOnline(true); refresh(); } };
    const onOffline = () => { setOnline(false); refresh(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = setInterval(refresh, 3000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  }, [refresh, simulatedOffline]);

  const isOnlineEffective = online && !simulatedOffline;
  const summary = offlineSync.getSummary();

  const handleSync = () => {
    if (!isOnlineEffective) return;
    setSyncing(true);
    const pending = offlineSync.getPendingRecords();
    pending.forEach((r) => offlineSync.markSyncing(r.localId));
    refresh();
    setTimeout(() => {
      pending.forEach((r) => offlineSync.markSynced(r.localId));
      refresh();
      setSyncing(false);
    }, 1500);
  };

  const handleResolveConflict = (localId: string, resolution: 'use_local' | 'use_server' | 'merge') => {
    offlineSync.resolveConflict(localId, resolution);
    refresh();
  };

  const handleClearSynced = () => {
    offlineSync.clearSynced();
    refresh();
  };

  const handleClearAll = () => {
    offlineSync.getQueue().forEach((r) => offlineSync.removeRecord(r.localId));
    localStorage.removeItem(DEMO_SEED_KEY);
    refresh();
  };

  const handleAddRecord = () => {
    if (!newPatientName.trim()) return;
    offlineSync.saveRecord(newRecordType, {
      patientName: newPatientName,
      notes: newNotes || 'Manual entry',
      createdAt: new Date().toISOString(),
    });
    setNewPatientName('');
    setNewNotes('');
    setShowAddForm(false);
    refresh();
  };

  const handleSimulateOffline = () => {
    setSimulatedOffline((prev) => {
      const next = !prev;
      if (next) {
        offlineSync.saveRecord('clinical_encounter', {
          patientName: 'Bruno',
          notes: 'Offline encounter — skin check',
          createdAt: new Date().toISOString(),
        });
        refresh();
      }
      return next;
    });
  };

  return (
    <div className="offline-sync-panel">
      <div className="osp-header">
        <h3><Cloud size={16} /> Offline Sync Status</h3>
        <div className="osp-connection">
          {isOnlineEffective ? <><Wifi size={14} /> <span className="status paid">ONLINE</span></> : <><WifiOff size={14} /> <span className="status overdue">OFFLINE</span></>}
        </div>
      </div>

      <div className="osp-summary">
        <div className={`osp-stat ${summary.pending > 0 ? 'highlight' : ''}`}>
          <strong>{summary.pending}</strong><small>Pending</small>
        </div>
        <div className={`osp-stat ${summary.syncing > 0 ? 'highlight' : ''}`}>
          <strong>{summary.syncing}</strong><small>Syncing</small>
        </div>
        <div className="osp-stat">
          <strong>{summary.synced}</strong><small>Synced</small>
        </div>
        <div className={`osp-stat ${summary.conflicts > 0 ? 'alert' : ''}`}>
          <strong>{summary.conflicts}</strong><small>Conflicts</small>
        </div>
        <div className={`osp-stat ${summary.failed > 0 ? 'alert' : ''}`}>
          <strong>{summary.failed}</strong><small>Failed</small>
        </div>
      </div>

      <div className="osp-actions">
        <button className="primary" onClick={handleSync} disabled={!isOnlineEffective || syncing || summary.pending === 0}>
          {syncing ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
          Sync Now
        </button>
        <button className="secondary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={14} /> Add Record
        </button>
        <button className="secondary" onClick={handleSimulateOffline}>
          {simulatedOffline ? <><Wifi size={14} /> Go Online</> : <><WifiOff size={14} /> Simulate Offline</>}
        </button>
        {summary.synced > 0 && <button className="secondary" onClick={handleClearSynced}><Check size={14} /> Clear Synced</button>}
        {queue.length > 0 && <button className="secondary" onClick={handleClearAll} style={{ color: '#e73535' }}><Trash2 size={14} /> Clear All</button>}
      </div>

      {showAddForm && (
        <div style={{ background: '#f8faff', border: '1px solid #dfe4eb', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#687993' }}>Record Type
              <select value={newRecordType} onChange={(e) => setNewRecordType(e.target.value as OfflineRecord['recordType'])} style={{ display: 'block', width: '100%', border: '1px solid #dce3ed', borderRadius: '6px', padding: '10px', marginTop: '6px', fontSize: '13px', color: '#263b60', background: '#fff' }}>
                <option value="clinical_record">Clinical Record</option>
                <option value="prescription">Prescription</option>
                <option value="clinical_encounter">Clinical Encounter</option>
                <option value="weight_entry">Weight Entry</option>
                <option value="vaccination_entry">Vaccination Entry</option>
              </select>
            </label>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#687993' }}>Patient Name
              <input value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} placeholder="e.g. Bruno" style={{ display: 'block', width: '100%', border: '1px solid #dce3ed', borderRadius: '6px', padding: '10px', marginTop: '6px', fontSize: '13px', color: '#263b60' }} />
            </label>
          </div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#687993', display: 'block', marginBottom: '10px' }}>Notes
            <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Clinical notes..." style={{ display: 'block', width: '100%', border: '1px solid #dce3ed', borderRadius: '6px', padding: '10px', marginTop: '6px', fontSize: '13px', color: '#263b60', minHeight: '60px', resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="primary" onClick={handleAddRecord} disabled={!newPatientName.trim()}><Plus size={14} /> Save Locally</button>
            <button className="secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!isOnlineEffective && (
        <div className="osp-offline-notice">
          <CloudOff size={16} />
          <p>You are offline. Clinical entries are saved locally and will sync when connection is restored. The server has not accepted these changes yet.</p>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="osp-empty"><Check size={24} /><p>No offline records. Sync queue is empty.</p></div>
      ) : (
        <div className="osp-queue">
          {queue.map((r) => {
            const Icon = RECORD_TYPE_ICONS[r.recordType] ?? FileText;
            const payload = r.payload as Record<string, unknown>;
            return (
              <div key={r.localId} className={`osp-record ${getSyncStatusColor(r.syncStatus)}`}>
                <div className="osp-record-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f2f4f7', display: 'grid', placeItems: 'center', color: '#78849a' }}>
                      <Icon size={14} />
                    </div>
                    <strong>{r.recordType.replace(/_/g, ' ')}</strong>
                    {payload.patientName && <span style={{ fontSize: '11px', color: '#53627b' }}>· {String(payload.patientName)}</span>}
                  </div>
                  <span className={`status ${getSyncStatusColor(r.syncStatus)}`}>{getSyncStatusLabel(r.syncStatus).toUpperCase()}</span>
                </div>
                <div className="osp-record-meta">
                  <small>Created: {new Date(r.createdAt).toLocaleString()}</small>
                  {payload.notes && <small>· {String(payload.notes).slice(0, 60)}</small>}
                  {r.retryCount > 0 && <small>· Retries: {r.retryCount}</small>}
                </div>
                {r.syncStatus === 'conflict' && r.conflictDetail && (
                  <div className="osp-conflict">
                    <AlertTriangle size={14} />
                    <div className="osp-conflict-detail">
                      <strong>Field: {r.conflictDetail.field}</strong>
                      <div className="osp-conflict-values">
                        <div><label>LOCAL</label><span>{String(r.conflictDetail.localValue)}</span><small>{r.conflictDetail.localTimestamp}</small></div>
                        <div><label>SERVER</label><span>{String(r.conflictDetail.serverValue)}</span><small>{r.conflictDetail.serverTimestamp}</small></div>
                      </div>
                    </div>
                    <div className="osp-conflict-actions">
                      <button className="secondary" onClick={() => handleResolveConflict(r.localId, 'use_local')}>Use Local</button>
                      <button className="secondary" onClick={() => handleResolveConflict(r.localId, 'use_server')}>Use Server</button>
                      <button className="secondary" onClick={() => handleResolveConflict(r.localId, 'merge')}>Merge</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
