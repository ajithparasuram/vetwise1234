import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/auth';
import { usePets } from '@/useData';
import { Card, EmptyState, ErrorState, Skeleton } from '@/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { pickPetPhoto } from '@/native';

export default function Second() {
  const { user } = useAuth();
  const client = user?.role === 'client';
  const { loading, error, data, refetch } = usePets();
  const pets = data;

  if (loading) return <View style={styles.root}><ScrollView contentContainerStyle={styles.content}><Text style={styles.kicker}>{client ? 'MY PETS' : 'PATIENTS'}</Text><Text style={styles.title}>{client ? 'Their care, beautifully organised.' : 'Every patient in view.'}</Text><View style={styles.skeletonCard}><Skeleton width="100%" height={86} /><View style={{ height: 10 }} /><Skeleton width="100%" height={86} /></View></ScrollView></View>;

  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>{client ? 'MY PETS' : 'PATIENTS'}</Text>
    <Text style={styles.title}>{client ? 'Their care, beautifully organised.' : 'Every patient in view.'}</Text>
    <Text style={styles.subtitle}>{client ? 'Create a living health passport for every pet in your family.' : 'Patients across your practice, ready when you need them.'}</Text>

    {client && <Pressable onPress={async () => { await pickPetPhoto(); refetch(); }} style={styles.primary}><Ionicons name="add" size={19} color={colors.surface} /><Text style={styles.primaryText}>Add a pet</Text></Pressable>}

    {error ? <ErrorState text={error} onRetry={refetch} /> : null}

    {pets.length === 0 && !error ? <EmptyState icon={client ? 'paw-outline' : 'people-outline'} title={client ? 'Add your first pet' : 'No patients yet'} text={client ? 'Build a complete pet passport with photos, medical history, and vaccinations.' : 'Patients will appear here once they are registered or assigned to you.'} actionLabel={client ? 'Add a pet' : undefined} onAction={client ? async () => { await pickPetPhoto(); refetch(); } : undefined} /> : null}

    {pets.map((pet) => <Pressable key={pet.petId} style={styles.petCard} onPress={() => router.push({ pathname: '/pet/[id]', params: { id: pet.petId } })}>
      <View style={styles.petPhoto}><Ionicons name="paw" size={26} color={colors.surface} /></View>
      <View style={{ flex: 1 }}>
        <View style={styles.petHeader}><Text style={styles.petName}>{pet.name}</Text><Ionicons name="chevron-forward" size={17} color={colors.muted} /></View>
        <Text style={styles.petBreed}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Text>
        <View style={styles.petMeta}>
          {pet.age ? <Text style={styles.petMetaText}>{pet.age}</Text> : null}
          {pet.sex ? <Text style={styles.petMetaText}>{pet.sex}</Text> : null}
          {pet.weight ? <Text style={styles.petMetaText}>{pet.weight}</Text> : null}
        </View>
      </View>
    </Pressable>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 36 }, kicker: { color: colors.greenDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 27, lineHeight: 32, fontWeight: '800', marginTop: 8, letterSpacing: -0.6 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 22 }, primary: { backgroundColor: colors.green, borderRadius: radius.sm, height: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 18 }, primaryText: { color: colors.surface, fontSize: 14, fontWeight: '800' }, skeletonCard: { marginTop: 8 }, petCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 12, ...shadow }, petPhoto: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, petHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, petName: { color: colors.ink, fontSize: 16, fontWeight: '800' }, petBreed: { color: colors.muted, fontSize: 13, marginTop: 3 }, petMeta: { flexDirection: 'row', gap: 8, marginTop: 8 }, petMetaText: { color: colors.greenDeep, fontSize: 11, fontWeight: '700', backgroundColor: colors.greenSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }, });
