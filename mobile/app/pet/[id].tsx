import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/api';
import { usePetDetail } from '@/useData';
import { Card, EmptyState, ErrorState, SectionTitle, StatusBadge } from '@/ui';
import { colors, radius, shadow, spacing } from '@/theme';

type Tab = 'overview' | 'medical' | 'vaccinations' | 'appointments' | 'documents';
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'information-circle-outline' },
  { id: 'medical', label: 'Medical', icon: 'document-text-outline' },
  { id: 'vaccinations', label: 'Vaccines', icon: 'shield-checkmark-outline' },
  { id: 'appointments', label: 'Visits', icon: 'calendar-outline' },
  { id: 'documents', label: 'Documents', icon: 'folder-outline' },
];

export default function PetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, error, pet, clinicalRecords, prescriptions, appointments, refetch } = usePetDetail(id ?? null);
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);

  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: true, headerBackTitle: 'Back', headerBackVisible: true, title: pet?.name ?? 'Pet Profile', headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.ink, headerShadowVisible: false }} />
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.green} /></View> : error ? <View style={styles.content}><ErrorState text={error} onRetry={refetch} /></View> : !pet ? <View style={styles.content}><EmptyState icon="paw-outline" title="Pet not found" text="This pet profile may have been removed." /></View> : <>
      <View style={styles.hero}>
        <View style={styles.heroPhoto}><Ionicons name="paw" size={34} color={colors.surface} /></View>
        <View style={styles.heroInfo}><Text style={styles.heroName}>{pet.name}</Text><Text style={styles.heroBreed}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Text></View>
        <Pressable onPress={() => setEditing(true)} style={styles.editBtn}><Ionicons name="create-outline" size={18} color={colors.greenDeep} /></Pressable>
      </View>
      <View style={styles.tabBar}>
        {tabs.map((t) => <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tabItem, tab === t.id && styles.tabActive]}><Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={17} color={tab === t.id ? colors.greenDeep : colors.muted} /><Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text></Pressable>)}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {tab === 'overview' && <OverviewSection pet={pet} />}
        {tab === 'medical' && <MedicalSection records={clinicalRecords as any[]} prescriptions={prescriptions as any[]} />}
        {tab === 'vaccinations' && <VaccinationsSection />}
        {tab === 'appointments' && <AppointmentsSection appointments={appointments as any[]} />}
        {tab === 'documents' && <DocumentsSection prescriptions={prescriptions as any[]} />}
      </ScrollView>
      {editing && pet ? <EditPetModal pet={pet} onClose={() => setEditing(false)} onSaved={refetch} /> : null}
    </>}
  </View>;
}

function OverviewSection({ pet }: { pet: any }) {
  const rows = [
    { label: 'Species', value: pet.species },
    { label: 'Breed', value: pet.breed || 'Not specified' },
    { label: 'Age', value: pet.age || 'Not specified' },
    { label: 'Sex', value: pet.sex || 'Not specified' },
    { label: 'Weight', value: pet.weight || 'Not specified' },
    { label: 'Color', value: pet.color || 'Not specified' },
    { label: 'Visits', value: String(pet.visits ?? 0) },
  ];
  return <View>
    <SectionTitle>Basic information</SectionTitle>
    <Card>{rows.map((row) => <View key={row.label} style={styles.infoRow}><Text style={styles.infoLabel}>{row.label}</Text><Text style={styles.infoValue}>{row.value}</Text></View>)}</Card>
    <SectionTitle>Identification</SectionTitle>
    <Card><View style={styles.infoRow}><Text style={styles.infoLabel}>Pet ID</Text><Text style={styles.infoValue}>{pet.petId.slice(0, 12)}</Text></View><View style={styles.infoRow}><Text style={styles.infoLabel}>Owner ID</Text><Text style={styles.infoValue}>{pet.ownerId.slice(0, 12)}</Text></View><View style={styles.infoRow}><Text style={styles.infoLabel}>Registered</Text><Text style={styles.infoValue}>{new Date(pet.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View></Card>
  </View>;
}

function MedicalSection({ records, prescriptions }: { records: any[]; prescriptions: any[] }) {
  return <View>
    <SectionTitle>Clinical history</SectionTitle>
    {records.length === 0 ? <EmptyState icon="document-text-outline" title="No clinical records" text="Consultation notes and diagnoses will appear here after each visit." /> : records.map((record) => <Card key={record.recordId} style={styles.recordCard}><View style={styles.recordHeader}><Text style={styles.recordDate}>{new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>{record.diagnosis ? <StatusBadge status={record.diagnosis ? 'completed' : 'pending'} /> : null}</View>{record.reason ? <Text style={styles.recordTitle}>{record.reason}</Text> : null}{record.diagnosis ? <Text style={styles.recordText}>Diagnosis: {record.diagnosis}</Text> : null}{record.treatment ? <Text style={styles.recordText}>Treatment: {record.treatment}</Text> : null}{record.notes ? <Text style={styles.recordText}>Notes: {record.notes}</Text> : null}</Card>)}
    <SectionTitle>Prescriptions</SectionTitle>
    {prescriptions.length === 0 ? <EmptyState icon="medkit-outline" title="No prescriptions" text="Prescribed medicines will appear here once your vet issues them." /> : prescriptions.map((rx) => <Card key={rx.rxId} style={styles.recordCard}><View style={styles.recordHeader}><Text style={styles.recordDate}>{new Date(rx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text><StatusBadge status={rx.status} /></View><Text style={styles.recordTitle}>{rx.meds}</Text>{rx.instructions ? <Text style={styles.recordText}>{rx.instructions}</Text> : null}</Card>)}
  </View>;
}

function VaccinationsSection() {
  return <View><SectionTitle>Vaccination history</SectionTitle><EmptyState icon="shield-checkmark-outline" title="No vaccination records" text="Vaccinations administered by your vet will appear here with upcoming reminders." /></View>;
}

function AppointmentsSection({ appointments }: { appointments: any[] }) {
  const upcoming = appointments.filter((a) => new Date(a.date) >= new Date(Date.now() - 86400000));
  const previous = appointments.filter((a) => new Date(a.date) < new Date(Date.now() - 86400000));
  return <View>
    <SectionTitle>Upcoming</SectionTitle>
    {upcoming.length === 0 ? <EmptyState icon="calendar-outline" title="No upcoming visits" text="Book a new appointment to see it appear here." /> : upcoming.map((appt) => <AppointmentMiniCard key={appt.appointmentId} appt={appt} />)}
    <SectionTitle>Previous</SectionTitle>
    {previous.length === 0 ? <EmptyState icon="time-outline" title="No past visits" text="Completed appointments will show up here." /> : previous.map((appt) => <AppointmentMiniCard key={appt.appointmentId} appt={appt} />)}
  </View>;
}

function AppointmentMiniCard({ appt }: { appt: any }) {
  return <Card style={styles.recordCard}><View style={styles.recordHeader}><Text style={styles.recordDate}>{new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {appt.time}</Text><StatusBadge status={appt.status} /></View>{appt.reason ? <Text style={styles.recordTitle}>{appt.reason}</Text> : null}{appt.visitType ? <Text style={styles.recordText}>{appt.visitType}{appt.location ? ` · ${appt.location}` : ''}</Text> : null}</Card>;
}

function DocumentsSection({ prescriptions }: { prescriptions: any[] }) {
  const finalized = prescriptions.filter((p) => p.status === 'finalized');
  return <View><SectionTitle>Medical documents</SectionTitle>{finalized.length === 0 ? <EmptyState icon="folder-open-outline" title="No documents yet" text="Prescriptions and medical reports will appear here once they are finalized by your vet." /> : finalized.map((rx) => <Card key={rx.rxId} style={styles.recordCard}><View style={styles.recordHeader}><Ionicons name="document-attach-outline" size={20} color={colors.greenDeep} /><Text style={styles.recordTitle}>Prescription</Text><StatusBadge status="finalized" /></View><Text style={styles.recordText}>{rx.meds}</Text><Text style={styles.recordText}>{new Date(rx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></Card>)}</View>;
}

function EditPetModal({ pet, onClose, onSaved }: { pet: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(pet.name ?? '');
  const [breed, setBreed] = useState(pet.breed ?? '');
  const [age, setAge] = useState(pet.age ?? '');
  const [weight, setWeight] = useState(pet.weight ?? '');
  const [sex, setSex] = useState(pet.sex ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    try {
      await api.updatePet(pet.petId, { name: name.trim(), breed, age, weight, sex });
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save'); } finally { setSaving(false); }
  };
  return <Modal visible transparent animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.modalSheet}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Edit {pet.name}</Text><Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.muted} /></Pressable></View>{error ? <Text style={styles.modalError}>{error}</Text> : null}<ScrollView><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Pet name" placeholderTextColor={colors.muted} /><TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="Breed" placeholderTextColor={colors.muted} /><View style={styles.inputRow}><TextInput style={[styles.input, { flex: 1 }]} value={age} onChangeText={setAge} placeholder="Age" placeholderTextColor={colors.muted} /><View style={{ width: 10 }} /><TextInput style={[styles.input, { flex: 1 }]} value={sex} onChangeText={setSex} placeholder="Sex" placeholderTextColor={colors.muted} /></View><TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="Weight" placeholderTextColor={colors.muted} /></ScrollView><Pressable disabled={saving} onPress={save} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>{saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.saveBtnText}>Save changes</Text>}</Pressable></View></View></Modal>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: spacing.lg, paddingTop: 8, paddingBottom: 36 }, scroll: { flex: 1 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.lg, paddingTop: 8 }, heroPhoto: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, heroInfo: { flex: 1 }, heroName: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }, heroBreed: { color: colors.muted, fontSize: 14, marginTop: 3 }, editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, tabBar: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.line }, tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: colors.green }, tabText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, tabTextActive: { color: colors.greenDeep }, infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, infoLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' }, infoValue: { color: colors.ink, fontSize: 13, fontWeight: '700' }, recordCard: { marginBottom: 10 }, recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, recordDate: { color: colors.muted, fontSize: 12, fontWeight: '700' }, recordTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 8 }, recordText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 }, modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,42,42,0.4)' }, modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, modalError: { color: colors.red, fontSize: 13, marginBottom: 10 }, input: { height: 50, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, color: colors.ink, fontSize: 15, marginBottom: 12 }, inputRow: { flexDirection: 'row', marginBottom: 4 }, saveBtn: { backgroundColor: colors.green, height: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, saveBtnText: { color: colors.surface, fontSize: 14, fontWeight: '800' } });
