import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';

export async function pickPetPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null;
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const available = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!available || !enrolled) return false;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock VetWise' });
  return result.success;
}

export async function registerForNotifications(): Promise<string | null> {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}
