import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api, apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function ProfileScreen() {
  const { user, profile, logout } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [myServiceIds, setMyServiceIds] = useState(new Set());
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [cat, mine] = await Promise.all([api.get('/catalog/services'), api.get('/partners/me/services')]);
      setCatalog(cat.data.serviceTypes);
      setMyServiceIds(new Set(mine.data.services.map((s) => s.serviceTypeId)));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleService(serviceTypeId, currentlyOffered) {
    setBusyId(serviceTypeId);
    try {
      if (currentlyOffered) {
        await api.delete(`/partners/me/services/${serviceTypeId}`);
      } else {
        await api.post('/partners/me/services', { serviceTypeId });
      }
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

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
          <Text style={styles.name}>{user?.name || 'Partner'}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <Text style={styles.kycLine}>KYC: {profile?.kycStatus?.replaceAll('_', ' ') || '—'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Services you offer</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing(4) }} />
        ) : (
          <View style={styles.serviceList}>
            {catalog.map((s) => {
              const offered = myServiceIds.has(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => toggleService(s.id, offered)}
                  disabled={busyId === s.id}
                  style={[styles.serviceRow, offered && styles.serviceRowActive]}
                >
                  <Text style={[styles.serviceName, offered && styles.serviceNameActive]}>{s.name}</Text>
                  <Text style={[styles.serviceToggle, offered && styles.serviceToggleActive]}>{offered ? 'Offering' : 'Add'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing(6) },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.textPrimary, marginBottom: spacing(6) },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(5), marginBottom: spacing(6) },
  name: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.textPrimary },
  phone: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: spacing(1) },
  kycLine: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accent, marginTop: spacing(2) },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginBottom: spacing(3) },
  serviceList: { gap: spacing(2) },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
  },
  serviceRowActive: { borderColor: colors.accent },
  serviceName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  serviceNameActive: { color: colors.textPrimary },
  serviceToggle: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  serviceToggleActive: { color: colors.accent },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginTop: spacing(4) },
  logoutButton: { marginTop: spacing(6), borderRadius: radius.md, borderWidth: 1, borderColor: colors.sos, paddingVertical: spacing(4), alignItems: 'center' },
  logoutText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.sos },
});
