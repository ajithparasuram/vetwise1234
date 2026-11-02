import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/auth';
import { useAppointments } from '@/useData';
import { usePets } from '@/useData';
import { Card, EmptyState, ErrorState, StatusBadge } from '@/ui';
import { api, ApiError, type Appointment } from '@/api';
import { colors, radius, shadow, spacing } from '@/theme';

type ViewMode = 'day' | 'week' | 'month';
type FilterMode = 'all' | 'upcoming' | 'available' | 'completed' | 'cancelled';

const today = new Date();
const formatDate = (d: Date) => d.toISOString().slice(0, 10);

function addDays(date: Date, days: number): Date { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function weekLabel(date: Date): string { const start = addDays(date, -date.getDay()); const end = addDays(start, 6); return `${start.getDate()} ${start.toLocaleString('en-IN', { month: 'short' })} — ${end.getDate()} ${end.toLocaleString('en-IN', { month: 'short' })}`; }

export default function Third() {
  const { user } = useAuth();
  const client = user?.role === 'client';
  const { loading, error, data, refetch } = useAppointments();
  const { data: pets } = usePets();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const petMap = useMemo(() => { const map = new Map<string, string>(); pets.forEach((p) => map.set(p.petId, p.name)); return map; }, [pets]);

  const filtered = useMemo(() => {
    let items = data;
    if (viewMode === 'day') items = items.filter((a) => { try { return isSameDay(new Date(a.date), selectedDate); } catch { return false; } });
    if (viewMode === 'week') { const start = addDays(selectedDate, -selectedDate.getDay()); const end = addDays(start, 6); items = items.filter((a) => { try { const d = new Date(a.date); return d >= start && d <= end; } catch { return false; } }); }
    if (viewMode === 'month') items = items.filter((a) => { try { const d = new Date(a.date); return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear(); } catch { return false; } });
    if (filter === 'upcoming') items = items.filter((a) => ['pending', 'confirmed'].includes(a.status));
    if (filter === 'available') items = items.filter((a) => a.status === 'pending' && !a.doctorId);
    if (filter === 'completed') items = items.filter((a) => a.status === 'completed');
    if (filter === 'cancelled') items = items.filter((a) => a.status === 'cancelled');
    return items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [data, viewMode, selectedDate, filter]);

  const performAction = async (appt: Appointment, action: 'accept' | 'confirm' | 'complete' | 'cancel') => {
    setActing(appt.appointmentId); setActionError('');
    const statusMap = { accept: 'confirmed', confirm: 'confirmed', complete: 'completed', cancel: 'cancelled' } as const;
    const body: Record<string, unknown> = { status: statusMap[action] };
    if (action === 'accept' || action === 'confirm') body.doctorId = user?.sub;
    try {
      await api.updateAppointment(appt.appointmentId, body);
      refetch();
    } catch (err) {
      const message = err instanceof ApiError ? (err.status === 409 ? 'This appointment was just claimed by another doctor.' : err.message) : 'Action failed';
      setActionError(message);
    } finally { setActing(null); }
  };

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[]}>
      <Text style={styles.kicker}>{client ? 'APPOINTMENTS' : 'SCHEDULE'}</Text>
      <Text style={styles.title}>{client ? 'Make time for their wellbeing.' : 'Your day, in focus.'}</Text>
      <Text style={styles.subtitle}>{client ? 'Book, manage, and revisit every visit.' : 'Daily, weekly, and monthly views of every appointment.'}</Text>

      {!client && <View style={styles.viewToggle}>
        {(['day', 'week', 'month'] as ViewMode[]).map((m) => <Pressable key={m} onPress={() => setViewMode(m)} style={[styles.viewBtn, viewMode === m && styles.viewBtnActive]}><Text style={[styles.viewBtnText, viewMode === m && styles.viewBtnTextActive]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text></Pressable>)}
      </View>}

      <View style={styles.dateNav}>
        <Pressable onPress={() => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -30))} style={styles.navBtn}><Ionicons name="chevron-back" size={20} color={colors.ink} /></Pressable>
        <Text style={styles.dateNavLabel}>{viewMode === 'day' ? selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }) : viewMode === 'week' ? weekLabel(selectedDate) : selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30))} style={styles.navBtn}><Ionicons name="chevron-forward" size={20} color={colors.ink} /></Pressable>
      </View>

      {!client && <View style={styles.filterRow}>
        {(['all', 'upcoming', 'available', 'completed', 'cancelled'] as FilterMode[]).map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}><Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text></Pressable>)}
      </View>}

      {error ? <ErrorState text={error} onRetry={refetch} /> : null}

      {actionError ? <View style={styles.actionError}><Ionicons name="warning-outline" size={16} color={colors.red} /><Text style={styles.actionErrorText}>{actionError}</Text></View> : null}

      {filtered.length === 0 && !loading && !error ? <EmptyState icon="calendar-outline" title="Nothing scheduled" text={client ? 'Your booked visits will appear here.' : 'No appointments match this view. Try a different filter or date.'} /> : null}

      {loading ? <Text style={styles.loadingText}>Loading appointments...</Text> : null}

      {filtered.map((appt) => <AppointmentCard key={appt.appointmentId} appt={appt} petName={petMap.get(appt.petId) ?? 'Unknown pet'} acting={acting === appt.appointmentId} onAction={performAction} isDoctor={!client} />)}
    </ScrollView>
  </View>;
}

function AppointmentCard({ appt, petName, acting, onAction, isDoctor }: { appt: Appointment; petName: string; acting: boolean; onAction: (appt: Appointment, action: 'accept' | 'confirm' | 'complete' | 'cancel') => void; isDoctor: boolean }) {
  const isToday = isSameDay(new Date(appt.date), today);
  return <Card style={styles.apptCard}>
    {isToday ? <View style={styles.todayBar} /> : null}
    <View style={styles.apptHeader}>
      <View style={styles.apptIcon}><Ionicons name="paw" size={18} color={colors.greenDeep} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.apptPet}>{petName}</Text>
        <Text style={styles.apptTime}>{new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {appt.time}</Text>
      </View>
      <StatusBadge status={appt.status} />
    </View>
    {appt.reason ? <Text style={styles.apptReason}>{appt.reason}</Text> : null}
    <View style={styles.apptMeta}>
      {appt.visitType ? <Text style={styles.apptMetaText}>{appt.visitType}</Text> : null}
      {appt.location ? <Text style={styles.apptMetaText}>{appt.location}</Text> : null}
    </View>
    {isDoctor && (appt.status === 'pending' || appt.status === 'confirmed') ? <View style={styles.actionRow}>
      {appt.status === 'pending' && !appt.doctorId ? <Pressable disabled={acting} onPress={() => onAction(appt, 'accept')} style={styles.acceptBtn}><Text style={styles.acceptBtnText}>{acting ? 'Accepting...' : 'Accept'}</Text></Pressable> : null}
      {appt.status === 'pending' && appt.doctorId ? <Pressable disabled={acting} onPress={() => onAction(appt, 'confirm')} style={styles.confirmBtn}><Text style={styles.confirmBtnText}>{acting ? 'Confirming...' : 'Confirm'}</Text></Pressable> : null}
      {appt.status === 'confirmed' ? <Pressable onPress={() => router.push({ pathname: '/consultation/[id]', params: { id: appt.appointmentId } })} style={styles.videoBtn}><Ionicons name="videocam" size={16} color={colors.surface} /><Text style={styles.videoBtnText}>Start video</Text></Pressable> : null}
      {appt.status === 'confirmed' ? <Pressable disabled={acting} onPress={() => onAction(appt, 'complete')} style={styles.completeBtn}><Text style={styles.completeBtnText}>{acting ? '...' : 'Complete'}</Text></Pressable> : null}
      <Pressable disabled={acting} onPress={() => onAction(appt, 'cancel')} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
    </View> : null}
    {isDoctor && appt.status === 'completed' ? <Pressable onPress={() => router.push({ pathname: '/pet/[id]', params: { id: appt.petId } })} style={styles.viewPetBtn}><Ionicons name="document-text-outline" size={15} color={colors.greenDeep} /><Text style={styles.viewPetBtnText}>View medical record</Text></Pressable> : null}
  </Card>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 36 }, kicker: { color: colors.greenDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 27, lineHeight: 32, fontWeight: '800', marginTop: 8 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 20 }, viewToggle: { flexDirection: 'row', gap: 8, marginBottom: 16 }, viewBtn: { flex: 1, paddingVertical: 11, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', ...shadow }, viewBtnActive: { backgroundColor: colors.green }, viewBtnText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, viewBtnTextActive: { color: colors.surface }, dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, navBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow }, dateNavLabel: { color: colors.ink, fontSize: 15, fontWeight: '800' }, filterRow: { flexDirection: 'row', gap: 6, marginBottom: 18, flexWrap: 'wrap' }, filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surface }, filterChipActive: { backgroundColor: colors.greenSoft }, filterChipText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, filterChipTextActive: { color: colors.greenDeep }, apptCard: { marginBottom: 12, overflow: 'hidden', position: 'relative' }, todayBar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: colors.green }, apptHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, apptIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, apptPet: { color: colors.ink, fontSize: 15, fontWeight: '800' }, apptTime: { color: colors.muted, fontSize: 12, marginTop: 3 }, apptReason: { color: colors.ink, fontSize: 13, marginTop: 10, lineHeight: 19 }, apptMeta: { flexDirection: 'row', gap: 8, marginTop: 10 }, apptMetaText: { color: colors.greenDeep, fontSize: 11, fontWeight: '700', backgroundColor: colors.greenSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }, actionRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }, acceptBtn: { backgroundColor: colors.green, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.sm }, acceptBtnText: { color: colors.surface, fontSize: 12, fontWeight: '800' }, confirmBtn: { backgroundColor: colors.blue, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.sm }, confirmBtnText: { color: colors.surface, fontSize: 12, fontWeight: '800' }, videoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.greenDeep, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm }, videoBtnText: { color: colors.surface, fontSize: 12, fontWeight: '800' }, completeBtn: { backgroundColor: colors.greenSoft, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm }, completeBtnText: { color: colors.greenDeep, fontSize: 12, fontWeight: '800' }, cancelBtn: { backgroundColor: colors.redSoft, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm }, cancelBtnText: { color: colors.red, fontSize: 12, fontWeight: '800' }, viewPetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }, viewPetBtnText: { color: colors.greenDeep, fontSize: 13, fontWeight: '700' }, actionError: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.redSoft, padding: 12, borderRadius: radius.sm, marginBottom: 14 }, actionErrorText: { color: colors.red, fontSize: 12, flex: 1 }, loadingText: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 20 } });
