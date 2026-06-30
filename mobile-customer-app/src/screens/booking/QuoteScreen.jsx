import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api, apiErrorMessage } from '../../api/client';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function QuoteScreen({ route, navigation }) {
  const { service, pickup, isSos } = route.params;
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post('/requests/quote', {
          serviceTypeId: service.id,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
        });
        setQuote(data);
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    })();
    (async () => {
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: pickup.lat, longitude: pickup.lng });
        if (place) {
          setPickupAddress([place.name, place.street, place.city].filter(Boolean).join(', '));
        }
      } catch {
        // reverse geocoding is best-effort; the user can type the address manually
      }
    })();
  }, []);

  function handleContinue() {
    navigation.navigate('Payment', {
      service,
      pickup,
      isSos,
      pickupAddress: pickupAddress.trim(),
      vehicleReg: vehicleReg.trim(),
      notes: notes.trim(),
      estimatedPrice: quote?.overallEstimatedPrice ?? service.basePrice,
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{service.name}</Text>
        {isSos && <Text style={styles.sosNote}>Marked as an emergency request</Text>}

        {error && <Text style={styles.error}>{error}</Text>}

        {!quote ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing(8) }} />
        ) : (
          <>
            <View style={styles.estimateCard}>
              <Text style={styles.estimateLabel}>Estimated price</Text>
              <Text style={styles.estimateValue}>\u20B9{quote.overallEstimatedPrice}</Text>
              <Text style={styles.estimateSub}>
                {quote.partnersFound} partner{quote.partnersFound === 1 ? '' : 's'} available within {quote.searchRadiusKm} km
              </Text>
            </View>

            {quote.quotes.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Nearby partners</Text>
                {quote.quotes.slice(0, 5).map((q) => (
                  <View key={q.partnerId} style={styles.partnerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partnerName}>{q.partnerName}</Text>
                      <Text style={styles.partnerMeta}>
                        \u2605 {q.avgRating?.toFixed(1) ?? '—'} &middot; {q.distanceKm.toFixed(1)} km &middot; {q.etaMinutes} min
                      </Text>
                    </View>
                    <Text style={styles.partnerPrice}>\u20B9{Math.round(q.estimatedPrice)}</Text>
                  </View>
                ))}
                <Text style={styles.dispatchNote}>The nearest available partner is matched automatically once you book.</Text>
              </>
            )}

            <Text style={styles.sectionTitle}>Pickup details</Text>
            <TextInput
              value={pickupAddress}
              onChangeText={setPickupAddress}
              placeholder="Pickup address"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <TextInput
              value={vehicleReg}
              onChangeText={setVehicleReg}
              placeholder="Vehicle number (optional)"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything the partner should know? (optional)"
              style={[styles.input, { height: 80 }]}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </>
        )}
      </ScrollView>
      {quote && (
        <View style={styles.footer}>
          <Button title="Continue to payment" onPress={handleContinue} variant={isSos ? 'danger' : 'primary'} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(6), paddingBottom: spacing(10) },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary },
  sosNote: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.sos, marginTop: spacing(1) },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginTop: spacing(3) },
  estimateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(5),
    marginTop: spacing(5),
    marginBottom: spacing(6),
  },
  estimateLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  estimateValue: { fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, marginTop: spacing(1) },
  estimateSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing(2) },
  sectionTitle: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.textPrimary, marginBottom: spacing(3) },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  partnerName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  partnerMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing(0.5) },
  partnerPrice: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  dispatchNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing(2), marginBottom: spacing(6) },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing(3),
  },
  footer: {
    padding: spacing(6),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
