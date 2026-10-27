/**
 * AppointmentBookingModal — professional appointment booking interface.
 * Supports patient/client auto-selection, doctor selection, time slots,
 * appointment types, and conflict-aware booking via the existing API.
 */

import { useState, useEffect } from 'react';
import { X, Check, CalendarDays, Loader2, Clock, MapPin } from 'lucide-react';
import { insertAppointment, fetchDoctors, fetchAppointments } from '@/lib/queries';

const APPT_TYPES = [
  'General Consultation', 'Follow-up', 'Vaccination', 'Surgery Consultation',
  'Diagnostic Consultation', 'Emergency Consultation', 'Grooming', 'Dental Check',
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

interface Props {
  patientId: string;
  clientId: string;
  patientName: string;
  clientName: string;
  role: 'doctor' | 'admin' | 'frontdesk' | 'client';
  onClose: () => void;
  onBooked: () => void;
}

export function AppointmentBookingModal({ patientId, clientId, patientName, clientName, role, onClose, onBooked }: Props) {
  const [apptType, setApptType] = useState('General Consultation');
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('Hospital Visit');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const [docRes, apptRes] = await Promise.all([fetchDoctors(), fetchAppointments()]);
      if (docRes.data) setDoctors(docRes.data as any[]);
      if (apptRes.data) {
        const slots = new Set<string>();
        (apptRes.data as any[]).forEach((a) => {
          const d = a.preferredDate ?? a.date;
          if (d && a.preferredTime) slots.add(`${d}|${a.preferredTime}`);
        });
        setBookedSlots(slots);
      }
      setLoading(false);
    })();
  }, []);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const isSlotBooked = (slot: string) => bookedSlots.has(`${date}|${slot}`);

  const handleBook = async () => {
    if (!date) { setError('Please select a date'); return; }
    if (!timeSlot) { setError('Please select a time slot'); return; }
    if (isSlotBooked(timeSlot)) { setError('This time slot is already booked. Please choose another.'); return; }

    setSaving(true); setError(null);
    const payload: Record<string, unknown> = {
      patientId,
      clientId,
      appointmentType: apptType,
      preferredDate: date,
      preferredTime: timeSlot,
      reason: reason.trim(),
      notes: notes.trim(),
      visitLocation: location,
      status: 'Scheduled',
    };
    if (doctorId) { payload.doctorId = doctorId; payload.doctorName = doctorName; }

    const { data, error: err } = await insertAppointment(payload);
    setSaving(false);
    if (err || !data) { setError(err ?? 'The server did not confirm the booking. Please try again.'); return; }
    setConfirmedAppt(data);
    setSuccess(true);
    onBooked();
  };

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="empty-state"><Loader2 size={24} className="spin" /><p>Loading booking form...</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">VETWISE</p>
            <h2>Book Appointment</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {success && confirmedAppt ? (
          <div className="booking-confirm">
            <div className="booking-success-icon"><Check size={32} /></div>
            <h3>Appointment Confirmed</h3>
            <p>Your appointment has been booked and confirmed by the server.</p>
            <div className="info-grid" style={{ marginTop: '16px' }}>
              <div><label>APPOINTMENT ID</label><strong className="pid-text">{confirmedAppt.appointmentId ?? confirmedAppt.appointment_id ?? '—'}</strong></div>
              <div><label>TYPE</label><strong>{apptType}</strong></div>
              <div><label>DATE</label><strong>{date}</strong></div>
              <div><label>TIME</label><strong>{timeSlot}</strong></div>
              <div><label>PATIENT</label><strong>{patientName}</strong></div>
              <div><label>STATUS</label><strong><em className="status scheduled">SCHEDULED</em></strong></div>
            </div>
            <button className="primary" onClick={onClose} style={{ marginTop: '20px' }}>Done</button>
          </div>
        ) : (
          <>
            <div className="modal-scroll">
              <div className="rx-patient-bar">
                <div><label>PATIENT</label><strong>{patientName}</strong></div>
                <div><label>CLIENT</label><strong>{clientName}</strong></div>
              </div>

              <div className="form-section">
                <div className="form-section-header"><CalendarDays size={16} /><span>Appointment Details</span></div>
                <div className="form-section-body">
                  <div className="form-grid">
                    <label>Appointment Type *
                      <select value={apptType} onChange={(e) => setApptType(e.target.value)}>
                        {APPT_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </label>
                    <label>Doctor
                      <select value={doctorId} onChange={(e) => {
                        setDoctorId(e.target.value);
                        const d = doctors.find((doc) => (doc.cognitoSub ?? doc.id) === e.target.value);
                        setDoctorName(d?.name ?? d?.fullName ?? '');
                      }}>
                        <option value="">Any available doctor</option>
                        {doctors.map((d) => (
                          <option key={d.cognitoSub ?? d.id} value={d.cognitoSub ?? d.id}>
                            {d.name ?? d.fullName ?? 'Doctor'}{d.specialization ? ` — ${d.specialization}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>Date *
                      <input type="date" min={minDateStr} max={maxDateStr} value={date} onChange={(e) => { setDate(e.target.value); setTimeSlot(''); }} />
                    </label>
                    <label>Location / Service Type
                      <select value={location} onChange={(e) => setLocation(e.target.value)}>
                        <option>Hospital Visit</option>
                        <option>Home Visit</option>
                        <option>Video Consultation</option>
                      </select>
                    </label>
                    <label className="wide">Reason for Visit
                      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief description of the reason for visit" />
                    </label>
                    <label className="wide">Notes
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" />
                    </label>
                  </div>
                </div>
              </div>

              {date && (
                <div className="form-section">
                  <div className="form-section-header"><Clock size={16} /><span>Available Time Slots — {date}</span></div>
                  <div className="form-section-body">
                    <div className="time-slot-grid">
                      {TIME_SLOTS.map((slot) => {
                        const booked = isSlotBooked(slot);
                        const selected = timeSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            className={`time-slot ${selected ? 'selected' : ''} ${booked ? 'booked' : ''}`}
                            disabled={booked}
                            onClick={() => setTimeSlot(slot)}
                          >
                            {slot}
                            {booked && <small>Booked</small>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="login-error" role="alert">{error}</p>}
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={onClose}>Cancel</button>
              <button className="primary" onClick={handleBook} disabled={saving || !date || !timeSlot}>
                {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />} Confirm Booking
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
