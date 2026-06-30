import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api, apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

const ACTIVE_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

export default function HomeScreen({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState('');

  const checkForActiveJob = useCallback(async () => {
    try {
      const { data } = await api.get('/partners/me/jobs');
      const active = data.jobs.find((j) => ACTIVE_STATUSES.includes(j.status));
      if (active) {
        navigation.replace('ActiveJob', { requestId: active.id });
        return true;
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
    return false;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await refreshProfile();
        const hasActiveJob = await checkForActiveJob();
        if (!hasActiveJob && active) {
          try {
            const { data } = await api.get('/partners/me/earnings');
            if (active) setEarnings(data);
          } catch (err) {
            setError(apiErrorMessage(err));
          }
        }
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [checkForActiveJob, refreshProfile])
  );

  useLocationTracking(!!profile?.isOnline, null);

  async function toggleOnline(value) {
    setToggling(true);
    setError('');
    try {
      await api.patch('/partners/me/availability', { isOnline: value, isAvailable: value });
      await refreshProfile();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const kycStatus = profile?.kycStatus;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.greeting}>Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>

        {kycStatus !== 'APPROVED' ? (
          <View style={styles.kycCard}>
            <Text style={styles.kycTitle}>
              {kycStatus === 'PENDING_REVIEW' ? 'Your documents are under review' : kycStatus === 'REJECTED' ? 'Verification was rejected' : 'Verify your identity to start'}
            </Text>
            <Text style={styles.kycSubtitle}>
              {kycStatus === 'PENDING_REVIEW'
                ? "We'll notify you as soon as it's approved — usually within a few hours."
                : kycStatus === 'REJECTED'
                ? profile?.rejectionReason || 'Please resubmit your documents.'
                : 'KYC verification is required before you can go online and accept jobs.'}
            </Text>
            {kycStatus !== 'PENDING_REVIEW' && (
              <Button title="Submit documents" onPress={() => navigation.navigate('KycSubmit')} style={{ marginTop: spacing(4) }} />
            )}
          </View>
        ) : (
          <View style={styles.toggleCard}>
            <View>
              <Text style={styles.toggleTitle}>{profile?.isOnline ? "You're online" : "You're offline"}</Text>
              <Text style={styles.toggleSubtitle}>{profile?.isOnline ? 'Looking for nearby job offers' : 'Go online to start receiving jobs'}</Text>
            </View>
            <Switch
              value={!!profile?.isOnline}
              onValueChange={toggleOnline}
              disabled={toggling}
              trackColor={{ false: colors.surfaceRaised, true: colors.onlineSoft }}
              thumbColor={profile?.isOnline ? colors.online : colors.textSecondary}
            />
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        {earnings && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>\u20B9{earnings.totalEarnings.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Total earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{earnings.totalJobs}</Text>
              <Text style={styles.statLabel}>Jobs completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{earnings.avgRating ? earnings.avgRating.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>Avg. rating</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing(6) },
  greeting: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.textPrimary, marginBottom: spacing(6) },
  kycCard: { backgroundColor: colors.warningSoft, borderRadius: radius.lg, padding: spacing(5) },
  kycTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.warning },
  kycSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: spacing(2) },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(5),
  },
  toggleTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.textPrimary },
  toggleSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing(1) },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginTop: spacing(4) },
  statsRow: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(6) },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(4), alignItems: 'center' },
  statValue: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: spacing(1), textAlign: 'center' },
});
