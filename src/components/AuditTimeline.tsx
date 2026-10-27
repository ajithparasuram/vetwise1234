/**
 * AuditTimeline — event/audit timeline for authorized users.
 * Shows the sequence of care events with actor, role, timestamp,
 * previous state, resulting state, and metadata.
 */

import { Clock, Check, Activity, FileText, ClipboardList, DollarSign, Stethoscope, Shield, Ban } from 'lucide-react';
import type { AuditEvent } from '@/lib/orchestration';
import { CARE_STATE_LABELS } from '@/lib/orchestration';

interface AuditTimelineProps {
  events: AuditEvent[];
  title?: string;
}

function eventIcon(eventType: string) {
  if (eventType.includes('Appointment') || eventType.includes('Visit')) return <Clock size={14} />;
  if (eventType.includes('Record')) return <FileText size={14} />;
  if (eventType.includes('Prescription')) return <ClipboardList size={14} />;
  if (eventType.includes('Payment')) return <DollarSign size={14} />;
  if (eventType.includes('Doctor') || eventType.includes('Assigned')) return <Stethoscope size={14} />;
  if (eventType.includes('Admin') || eventType.includes('Approved') || eventType.includes('Authorized')) return <Shield size={14} />;
  if (eventType.includes('Rejected') || eventType.includes('Cancelled')) return <Ban size={14} />;
  return <Activity size={14} />;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  doctor: 'Vet',
  client: 'Owner',
  frontdesk: 'Front Desk',
};

export function AuditTimeline({ events, title = 'Audit Timeline' }: AuditTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="audit-timeline">
        <div className="at-header"><h3><Activity size={16} /> {title}</h3></div>
        <div className="at-empty"><Clock size={24} /><p>No events recorded yet.</p></div>
      </div>
    );
  }

  return (
    <div className="audit-timeline">
      <div className="at-header">
        <h3><Activity size={16} /> {title}</h3>
        <small>{events.length} events</small>
      </div>

      <div className="at-events">
        {events.map((event, i) => (
          <div key={event.eventId} className={`at-event ${event.source === 'offline_queue' ? 'offline' : ''}`}>
            <div className="at-event-dot">{eventIcon(event.eventType)}</div>
            <div className="at-event-content">
              <div className="at-event-head">
                <strong>{event.eventType.replace(/_/g, ' ')}</strong>
                <small>{new Date(event.timestamp).toLocaleString()}</small>
              </div>
              <div className="at-event-meta">
                <span className="at-actor">
                  {ROLE_LABELS[event.actorRole] ?? event.actorRole}: {event.actorId}
                </span>
                {event.previousState && event.resultingState && (
                  <span className="at-transition">
                    {CARE_STATE_LABELS[event.previousState] ?? event.previousState}
                    <Check size={10} />
                    {CARE_STATE_LABELS[event.resultingState] ?? event.resultingState}
                  </span>
                )}
                {event.source === 'offline_queue' && (
                  <span className="at-offline-tag">Offline</span>
                )}
              </div>
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="at-event-detail">
                  {Object.entries(event.metadata).slice(0, 3).map(([k, v]) => (
                    <small key={k}>{k}: {String(v)}</small>
                  ))}
                </div>
              )}
            </div>
            {i < events.length - 1 && <div className="at-connector" />}
          </div>
        ))}
      </div>
    </div>
  );
}
