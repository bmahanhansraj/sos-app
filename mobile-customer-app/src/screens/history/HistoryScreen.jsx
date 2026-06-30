import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api, apiErrorMessage } from '../../api/client';
import StatusPill from '../../components/StatusPill';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function HistoryScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [serviceTypes, setServiceTypes] = useState({});
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [reqs, catalog] = await Promise.all([api.get('/requests'), api.get('/catalog/services')]);
      setRequests(reqs.data.requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setServiceTypes(Object.fromEntries(catalog.data.serviceTypes.map((s) => [s.id, s.name])));
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

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Your requests</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={<Text style={styles.empty}>No requests yet. Book one from the Home tab.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Tracking', { requestId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.service}>{serviceTypes[item.serviceTypeId] || 'Service'}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: spacing(2) }}>
              <StatusPill status={item.status} />
              <Text style={styles.price}>\u20B9{(item.finalPrice ?? item.estimatedPrice).toFixed(0)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, paddingHorizontal: spacing(6), paddingTop: spacing(5) },
  list: { padding: spacing(6) },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, paddingHorizontal: spacing(6) },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing(10) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  service: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing(1) },
  price: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
});
