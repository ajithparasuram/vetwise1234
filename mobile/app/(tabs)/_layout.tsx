import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useAuth } from '@/auth';

export default function TabsLayout() {
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const isAdmin = user?.role === 'admin';
  const isFrontDesk = user?.role === 'frontdesk';
  const items = isClient
    ? { home: 'Home', second: 'My Pets', third: 'Appointments' }
    : { home: isAdmin ? 'Overview' : isFrontDesk ? 'Front desk' : 'Dashboard', second: isAdmin ? 'Doctors' : 'Patients', third: isAdmin ? 'Operations' : 'Schedule' };
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: isClient ? colors.green : colors.blue, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 68, paddingTop: 8, borderTopColor: colors.line, backgroundColor: colors.surface }, tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }, tabBarIcon: ({ color, size }) => { const icon = route.name === 'home' ? 'home-outline' : route.name === 'second' ? (isClient ? 'paw-outline' : 'people-outline') : route.name === 'third' ? 'calendar-outline' : route.name === 'notifications' ? 'notifications-outline' : 'person-outline'; return <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size} color={color} />; } })}><Tabs.Screen name="home" options={{ title: items.home }} /><Tabs.Screen name="second" options={{ title: items.second }} /><Tabs.Screen name="third" options={{ title: items.third }} /><Tabs.Screen name="notifications" options={{ title: 'Alerts' }} /><Tabs.Screen name="profile" options={{ title: 'Profile' }} /></Tabs>;
}
