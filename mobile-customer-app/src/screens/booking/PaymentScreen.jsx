import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../../api/client';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

const METHODS = [
  { key: 'UPI', label: 'UPI' },
  { key: 'CARD', label: 'Card' },
  { key: 'NETBANKING', label: 'Netbanking' },
  { key: 'WALLET', label: 'Wallet' },
];

export default function PaymentScreen({ route, navigation }) {
  const { service, pickup, isSos, pickupAddress, vehicleReg, notes, estimatedPrice } = route.params;
  const [method, setMethod] = useState('UPI');
  const [creating, setCreating] = useState(true);
  const [paying, setPaying] = useState(false);
  const [order, setOrder] = useState(null); // { request, payment }
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post('/requests', {
          serviceTypeId: service.id,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          pickupAddress: pickupAddress || undefined,
          vehicleDetails: vehicleReg ? { regNumber: vehicleReg } : undefined,
          customerNotes: notes || undefined,
          isSos: !!isSos,
          paymentMethod: method,
        });
        setOrder(data);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setCreating(false);
      }
    })();
    // Order is created once on entry. In production, switching payment
    // method here would mean re-creating the order with the gateway, but
    // for this demo we only support choosing the method before the order
    // is placed (see the UI note below).
  }, []);

  async function handlePay() {
    if (!order) return;
    setPaying(true);
    setError('');
    try {
      // In production this is where react-native-razorpay's checkout would
      // open, returning a signed payment id + signature that gets POSTed
      // here. In mock mode (no Razorpay keys configured on the backend) the
      // confirm endpoint accepts an empty body and marks the order paid.
      const { data } = await api.post(`/payments/${order.payment.id}/confirm`, {});
      if (data.dispatch?.dispatched) {
        navigation.replace('Tracking', { requestId: order.request.id });
      } else {
        navigation.replace('Tracking', { requestId: order.request.id, noPartnerFound: true });
      }
    } catch (err) {
      setError(apiErrorMessage(err));
      setPaying(false);
    }
  }

  async function handleSimulateFailure() {
    if (!order) return;
    setPaying(true);
    setError('');
    try {
      await api.post(`/payments/${order.payment.id}/simulate-failure`);
      navigation.popToTop();
    } catch (err) {
      setError(apiErrorMessage(err));
      setPaying(false);
    }
  }

  if (creating) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.creatingText}>Setting up your order...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.subtitle}>{service.name}</Text>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount payable</Text>
          <Text style={styles.amountValue}>\u20B9{order ? order.request.estimatedPrice : estimatedPrice}</Text>
          <Text style={styles.amountNote}>Prepaid — your partner is matched as soon as payment is confirmed.</Text>
        </View>

        <Text style={styles.sectionTitle}>Pay with</Text>
        <View style={styles.methodRow}>
          {METHODS.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMethod(m.key)}
              style={[styles.methodChip, method === m.key && styles.methodChipActive]}
            >
              <Text style={[styles.methodText, method === m.key && styles.methodTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.spacer} />

        <Button
          title={paying ? 'Processing...' : `Pay \u20B9${order ? order.request.estimatedPrice : estimatedPrice}`}
          onPress={handlePay}
          loading={paying}
          disabled={paying || !order}
        />
        <TouchableOpacity onPress={handleSimulateFailure} disabled={paying} style={styles.failureLink}>
          <Text style={styles.failureLinkText}>Simulate a failed payment (demo)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  creatingText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: spacing(3) },
  content: { flex: 1, padding: spacing(6) },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: spacing(1), marginBottom: spacing(6) },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(5),
    marginBottom: spacing(6),
  },
  amountLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  amountValue: { fontFamily: fonts.display, fontSize: 30, color: colors.textPrimary, marginTop: spacing(1) },
  amountNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing(2) },
  sectionTitle: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.textPrimary, marginBottom: spacing(3) },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  methodChip: {
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  methodText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  methodTextActive: { color: colors.textOnAccent },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginTop: spacing(4) },
  spacer: { flex: 1 },
  failureLink: { marginTop: spacing(4), alignItems: 'center' },
  failureLinkText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, textDecorationLine: 'underline' },
});
