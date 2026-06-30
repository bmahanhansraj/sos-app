import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Best-effort: requests permission and fetches an Expo push token so job
// offers, broadcasts, and KYC updates can reach this device even when the
// app is backgrounded. Silently no-ops on simulators, web, or when
// permission is denied -- the in-app job-offer flow still works via the
// socket connection either way, so a missing token never blocks the rest
// of the app.
export async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token || null;
  } catch (err) {
    console.log('[push] registration skipped:', err.message);
    return null;
  }
}
