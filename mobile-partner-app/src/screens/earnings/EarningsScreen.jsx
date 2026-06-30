import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api, apiErrorMessage } from '../../api/client';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/partners/me/earnings');
      setEarnings(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!earnings) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={earnings.recentCompletedJobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing(6) }}>
            <Text style={styles.title}>Earnings</Text>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Total earnings</Text>
              <Text style={styles.heroValue}>\u20B9{earnings.totalEarnings.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{earnings.totalJobs}</Text>
                <Text style={styles.statLabel}>Jobs completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{earnings.avgRating ? earnings.avgRating.toFixed(1) : '—'}</Text>
                <Text style={styles.statLabel}>Avg. rating ({earnings.totalRatings})</Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Recent jobs</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No completed jobs yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.jobRow}>
            <View>
              <Text style={styles.jobNumber}>{item.requestNumber}</Text>
              <Text style={styles.jobDate}>{new Date(item.completedAt || item.createdAt).toLocaleDateString('en-IN')}</Text>
            </View>
            <Text style={styles.jobPrice}>\u20B9{item.finalPrice ?? item.estimatedPrice}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing(6) },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.textPrimary, marginBottom: spacing(5) },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13 },
  heroCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(5) },
  heroLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  heroValue: { fontFamily: fonts.displayBold, fontSize: 32, color: colors.online, marginTop: spacing(1) },
  statsRow: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(3) },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(4), alignItems: 'center' },
  statValue: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: spacing(1), textAlign: 'center' },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginTop: spacing(6) },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing(6) },
  jobRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(4), marginBottom: spacing(2.5) },
  jobNumber: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary },
  jobDate: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing(1) },
  jobPrice: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
});
