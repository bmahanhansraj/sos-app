import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../../api/client';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function RatingScreen({ route, navigation }) {
  const { requestId } = route.params;
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/requests/${requestId}/rate`, { rating, review: review.trim() || undefined });
      navigation.popToTop();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>How was your service?</Text>
        <Text style={styles.subtitle}>Your rating helps other customers choose great partners.</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)}>
              <Text style={[styles.star, n <= rating && styles.starFilled]}>{'\u2605'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          value={review}
          onChangeText={setReview}
          placeholder="Add a comment (optional)"
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
          multiline
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button title={busy ? 'Submitting...' : 'Submit rating'} onPress={submit} loading={busy} />
        <TouchableOpacity onPress={() => navigation.popToTop()} style={{ marginTop: spacing(4) }}>
          <Text style={styles.skip}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing(6), justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing(2), marginBottom: spacing(8) },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing(3), marginBottom: spacing(8) },
  star: { fontSize: 36, color: colors.border },
  starFilled: { color: colors.accent },
  input: {
    minHeight: 90,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing(6),
    textAlignVertical: 'top',
  },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginBottom: spacing(3), textAlign: 'center' },
  skip: { textAlign: 'center', fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
});
