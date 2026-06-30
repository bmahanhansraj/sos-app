import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api, apiErrorMessage } from '../../api/client';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function RatingsScreen() {
  const [ratings, setRatings] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/partners/me/ratings');
      setRatings(data.ratings);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (ratings === null) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Ratings</Text>
      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No ratings yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.stars}>{'\u2605'.repeat(item.rating)}{'\u2606'.repeat(5 - item.rating)}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
            </View>
            {item.review && <Text style={styles.review}>{item.review}</Text>}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.textPrimary, paddingHorizontal: spacing(6), paddingTop: spacing(5) },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13 },
  list: { padding: spacing(6) },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing(10) },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(4), marginBottom: spacing(3) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stars: { fontSize: 16, color: colors.accent },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  review: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, marginTop: spacing(2) },
});
