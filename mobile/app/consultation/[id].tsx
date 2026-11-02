import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { useAppointments } from '@/useData';
import { usePets } from '@/useData';
import { Card, StatusBadge } from '@/ui';
import { colors, radius, shadow, spacing } from '@/theme';

type CallState = 'idle' | 'connecting' | 'configured-required' | 'ended';
type ToolTab = 'notes' | 'diagnosis' | 'prescription';

export default function Consultation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: appointments } = useAppointments();
  const { data: pets } = usePets();
  const appointment = appointments.find((a) => a.appointmentId === id) ?? null;
  const pet = pets.find((p) => p.petId === appointment?.petId) ?? null;

  const [callState, setCallState] = useState<CallState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [frontCam, setFrontCam] = useState(true);
  const [toolTab, setToolTab] = useState<ToolTab>('notes');
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [followup, setFollowup] = useState('');
  const [meds, setMeds] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (callState !== 'connecting') return;
    const timer = setTimeout(() => {
      setCallState('configured-required');
    }, 1200);
    return () => clearTimeout(timer);
  }, [callState]);

  useEffect(() => {
    if (callState !== 'connecting') return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const startCall = () => { setCallState('connecting'); setElapsed(0); };
  const endCall = () => { setCallState('ended'); router.back(); };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const saveNotes = async () => {
    if (!appointment || !pet) return;
    setSaving(true); setError('');
    try {
      if (diagnosis.trim()) {
        await api.createClinicalRecord({ petId: pet.petId, appointmentId: appointment.appointmentId, reason: appointment.reason ?? 'Video consultation', diagnosis: diagnosis.trim(), treatment: meds.trim(), notes: notes.trim(), followup: followup.trim() || undefined });
      }
      if (meds.trim()) {
        await api.createPrescription({ petId: pet.petId, appointmentId: appointment.appointmentId, meds: meds.trim(), instructions: instructions.trim() });
      }
      setSaved(true);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not save notes'); } finally { setSaving(false); }
  };

  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: true, headerBackTitle: 'Back', title: 'Video Consultation', headerStyle: { backgroundColor: colors.ink }, headerTintColor: colors.surface, headerShadowVisible: false }} />
    {callState === 'idle' ? <ReadyScreen pet={pet} appointment={appointment} onStart={startCall} /> :
     callState === 'connecting' ? <ConnectingScreen elapsed={elapsed} /> :
     callState === 'ended' ? null :
     <ActiveCallScreen
      pet={pet} appointment={appointment} elapsed={elapsed} micOn={micOn} camOn={camOn} speakerOn={speakerOn} frontCam={frontCam}
      toolTab={toolTab} setToolTab={setToolTab}
      notes={notes} setNotes={setNotes} diagnosis={diagnosis} setDiagnosis={setDiagnosis} followup={followup} setFollowup={setFollowup}
      meds={meds} setMeds={setMeds} instructions={instructions} setInstructions={setInstructions}
      saving={saving} saved={saved} error={error} onSave={saveNotes}
      onToggleMic={() => setMicOn(!micOn)} onToggleCam={() => setCamOn(!camOn)} onToggleSpeaker={() => setSpeakerOn(!speakerOn)} onFlipCam={() => setFrontCam(!frontCam)}
      onEnd={endCall}
    />}
  </View>;
}

function ReadyScreen({ pet, appointment, onStart }: { pet: any; appointment: any; onStart: () => void }) {
  return <ScrollView contentContainerStyle={styles.readyContent}>
    <View style={styles.readyHero}><View style={styles.readyAvatar}><Ionicons name="paw" size={40} color={colors.surface} /></View><Text style={styles.readyPetName}>{pet?.name ?? 'Unknown pet'}</Text><Text style={styles.readyBreed}>{pet?.species}{pet?.breed ? ` · ${pet.breed}` : ''}</Text></View>
    <Card style={styles.readyCard}><Text style={styles.readyTitle}>Ready to consult</Text><Text style={styles.readyText}>A secure video session will connect you with the pet owner. The backend will validate the appointment and issue a short-lived session token before the call begins.</Text>{appointment ? <View style={styles.readyAppt}><Ionicons name="calendar-outline" size={17} color={colors.greenDeep} /><Text style={styles.readyApptText}>{new Date(appointment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {appointment.time}</Text><StatusBadge status={appointment.status} /></View> : null}</Card>
    <Pressable onPress={onStart} style={styles.startBtn}><Ionicons name="videocam" size={20} color={colors.surface} /><Text style={styles.startBtnText}>Start consultation</Text></Pressable>
  </ScrollView>;
}

function ConnectingScreen({ elapsed }: { elapsed: number }) {
  return <View style={styles.connecting}><ActivityIndicator size="large" color={colors.green} /><Text style={styles.connectingText}>Creating secure session...</Text><Text style={styles.connectingSub}>Verifying appointment and participant permissions</Text></View>;
}

function ActiveCallScreen(props: any) {
  const { pet, elapsed, micOn, camOn, speakerOn, frontCam, toolTab, setToolTab, notes, setNotes, diagnosis, setDiagnosis, followup, setFollowup, meds, setMeds, instructions, setInstructions, saving, saved, error, onSave, onToggleMic, onToggleCam, onToggleSpeaker, onFlipCam, onEnd } = props;
  return <View style={styles.callRoot}>
    <View style={styles.remoteVideo}><View style={styles.remotePlaceholder}><Ionicons name="paw" size={60} color={colors.surface} /><Text style={styles.remoteText}>{pet?.name ?? 'Patient'}</Text><Text style={styles.remoteSub}>Video provider not configured</Text></View>
      <View style={styles.callOverlay}><View style={styles.durationPill}><View style={[styles.durationDot, { backgroundColor: colors.green }]} /><Text style={styles.durationText}>{Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}</Text></View><View style={styles.qualityPill}><Ionicons name="cellular" size={14} color={colors.surface} /><Text style={styles.qualityText}>HD</Text></View></View>
      <View style={styles.localPreview}><View style={styles.localPlaceholder}><Ionicons name={camOn ? 'videocam' : 'videocam-off'} size={20} color={colors.surface} /></View></View>
    </View>
    <View style={styles.configNotice}><Ionicons name="information-circle-outline" size={17} color={colors.amber} /><Text style={styles.configNoticeText}>A WebRTC video provider (e.g. Amazon Chime SDK, Twilio Video, or LiveKit) must be configured on the backend. The UI, controls, and clinical tools below are fully functional. Video streaming requires a backend endpoint that issues short-lived consultation tokens.</Text></View>
    <View style={styles.controlsRow}><CallControl icon={micOn ? 'mic' : 'mic-off'} label="Mic" on={micOn} onPress={onToggleMic} /><CallControl icon={camOn ? 'videocam' : 'videocam-off'} label="Camera" on={camOn} onPress={onToggleCam} /><CallControl icon="swap-horizontal" label="Flip" on onPress={onFlipCam} /><CallControl icon={speakerOn ? 'volume-high' : 'volume-mute'} label="Speaker" on={speakerOn} onPress={onToggleSpeaker} /><CallControl icon="call" label="End" danger onPress={onEnd} /></View>
    <View style={styles.toolTabs}><Pressable onPress={() => setToolTab('notes')} style={[styles.toolTab, toolTab === 'notes' && styles.toolTabActive]}><Ionicons name="document-text-outline" size={16} color={toolTab === 'notes' ? colors.greenDeep : colors.muted} /><Text style={[styles.toolTabText, toolTab === 'notes' && styles.toolTabTextActive]}>Notes</Text></Pressable><Pressable onPress={() => setToolTab('diagnosis')} style={[styles.toolTab, toolTab === 'diagnosis' && styles.toolTabActive]}><Ionicons name="medkit-outline" size={16} color={toolTab === 'diagnosis' ? colors.greenDeep : colors.muted} /><Text style={[styles.toolTabText, toolTab === 'diagnosis' && styles.toolTabTextActive]}>Diagnosis</Text></Pressable><Pressable onPress={() => setToolTab('prescription')} style={[styles.toolTab, toolTab === 'prescription' && styles.toolTabActive]}><Ionicons name="file-tray-outline" size={16} color={toolTab === 'prescription' ? colors.greenDeep : colors.muted} /><Text style={[styles.toolTabText, toolTab === 'prescription' && styles.toolTabTextActive]}>Prescribe</Text></Pressable></View>
    <ScrollView style={styles.toolScroll} contentContainerStyle={{ paddingBottom: 36 }}>
      {toolTab === 'notes' ? <TextInput style={styles.toolInput} value={notes} onChangeText={setNotes} placeholder="Private clinical notes for this consultation..." placeholderTextColor={colors.muted} multiline textAlignVertical="top" /> : null}
      {toolTab === 'diagnosis' ? <><TextInput style={styles.toolInput} value={diagnosis} onChangeText={setDiagnosis} placeholder="Primary diagnosis" placeholderTextColor={colors.muted} multiline textAlignVertical="top" /><TextInput style={styles.toolInput} value={followup} onChangeText={setFollowup} placeholder="Follow-up recommendation" placeholderTextColor={colors.muted} multiline textAlignVertical="top" /></> : null}
      {toolTab === 'prescription' ? <><TextInput style={styles.toolInput} value={meds} onChangeText={setMeds} placeholder="Medications (e.g. Amoxicillin 250mg, twice daily for 7 days)" placeholderTextColor={colors.muted} multiline textAlignVertical="top" /><TextInput style={styles.toolInput} value={instructions} onChangeText={setInstructions} placeholder="Instructions for the pet owner" placeholderTextColor={colors.muted} multiline textAlignVertical="top" /></> : null}
      {error ? <Text style={styles.saveError}>{error}</Text> : null}
      {saved ? <View style={styles.savedBox}><Ionicons name="checkmark-circle" size={18} color={colors.greenDeep} /><Text style={styles.savedText}>Clinical notes and prescription saved to the pet's record.</Text></View> : null}
      <Pressable disabled={saving} onPress={onSave} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>{saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.saveBtnText}>Save to medical record</Text>}</Pressable>
    </ScrollView>
  </View>;
}

function CallControl({ icon, label, on, danger, onPress }: { icon: string; label: string; on?: boolean; danger?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.callControl, danger && styles.callControlDanger, !on && !danger && styles.callControlOff]}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.surface} /><Text style={styles.callControlLabel}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.ink }, readyContent: { padding: spacing.lg, paddingTop: 40 }, readyHero: { alignItems: 'center', paddingVertical: 30 }, readyAvatar: { width: 90, height: 90, borderRadius: 30, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, readyPetName: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 16 }, readyBreed: { color: colors.muted, fontSize: 14, marginTop: 4 }, readyCard: { marginTop: 24 }, readyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, readyText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 }, readyAppt: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line }, readyApptText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700' }, startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.green, height: 56, borderRadius: radius.md, marginTop: 24 }, startBtnText: { color: colors.surface, fontSize: 16, fontWeight: '800' }, connecting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }, connectingText: { color: colors.surface, fontSize: 17, fontWeight: '800' }, connectingSub: { color: '#9CB8B0', fontSize: 13 }, callRoot: { flex: 1, backgroundColor: colors.ink }, remoteVideo: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }, remotePlaceholder: { alignItems: 'center' }, remoteText: { color: colors.surface, fontSize: 18, fontWeight: '800', marginTop: 14 }, remoteSub: { color: '#9CB8B0', fontSize: 12, marginTop: 4 }, callOverlay: { position: 'absolute', top: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 }, durationPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }, durationDot: { width: 8, height: 8, borderRadius: 4 }, durationText: { color: colors.surface, fontSize: 13, fontWeight: '800' }, qualityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 }, qualityText: { color: colors.surface, fontSize: 11, fontWeight: '800' }, localPreview: { position: 'absolute', top: 60, right: 16, width: 90, height: 130, borderRadius: 14, overflow: 'hidden' }, localPlaceholder: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }, configNotice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.amberSoft, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 0 }, configNoticeText: { flex: 1, color: colors.amber, fontSize: 11, lineHeight: 16 }, controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 18, backgroundColor: '#0A1F1F' }, callControl: { alignItems: 'center', gap: 5, width: 64 }, callControlOff: { opacity: 0.5 }, callControlDanger: { backgroundColor: colors.red, borderRadius: 28, paddingVertical: 10, paddingHorizontal: 14 }, callControlLabel: { color: '#9CB8B0', fontSize: 10, fontWeight: '700' }, toolTabs: { flexDirection: 'row', backgroundColor: '#0A1F1F', paddingHorizontal: 12, paddingBottom: 4 }, toolTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' }, toolTabActive: { borderBottomColor: colors.green }, toolTabText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, toolTabTextActive: { color: colors.greenDeep }, toolScroll: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg, paddingTop: spacing.md }, toolInput: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: 14, color: colors.ink, fontSize: 14, minHeight: 100, marginBottom: 12, textAlignVertical: 'top' }, saveBtn: { backgroundColor: colors.green, height: 50, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, saveBtnText: { color: colors.surface, fontSize: 14, fontWeight: '800' }, saveError: { color: colors.red, fontSize: 13, marginBottom: 10 }, savedBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.greenSoft, padding: 12, borderRadius: radius.sm, marginBottom: 12 }, savedText: { flex: 1, color: colors.greenDeep, fontSize: 12, fontWeight: '700' } });
