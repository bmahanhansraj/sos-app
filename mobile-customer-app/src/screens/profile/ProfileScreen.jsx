import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function ProfileScreen() {
  const { user, profile, logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Log out?', 'You can log back in any time with your phone number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.name}>{user?.name || 'Customer'}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.rowLabel}>Total requests placed</Text>
          <Text style={styles.rowValue}>{profile?.totalRequests ?? 0}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(6) },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, marginBottom: spacing(6) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(5),
    marginBottom: spacing(4),
  },
  name: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.textPrimary },
  phone: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: spacing(1) },
  rowLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  rowValue: { fontFamily: fonts.displayMedium, fontSize: 20, color: colors.textPrimary, marginTop: spacing(1) },
  logoutButton: {
    marginTop: spacing(4),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sos,
    paddingVertical: spacing(4),
    alignItems: 'center',
  },
  logoutText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.sos },
});
