import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Best-effort: requests permission and fetches an Expo push token so the
// admin dashboard's broadcast feature (and job-related pushes) can reach
// this device. Silently no-ops on simulators, web, or when permission is
// denied -- in-app notifications still work via polling either way, so a
// missing token never blocks the rest of the app.
export async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
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
