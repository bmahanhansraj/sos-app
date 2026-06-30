import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../../api/client';
import { getSocket } from '../../api/socket';
import { useAuth } from '../../context/AuthContext';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import StatusPill from '../../components/StatusPill';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

const NEXT_STEP = {
  ASSIGNED: { label: 'Start trip (mark en route)', next: 'EN_ROUTE' },
  EN_ROUTE: { label: 'Mark arrived', next: 'ARRIVED' },
  ARRIVED: { label: 'Start job', next: 'IN_PROGRESS' },
};

export default function ActiveJobScreen({ route, navigation }) {
  const { requestId } = route.params;
  const { refreshProfile } = useAuth();
  const [request, setRequest] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);

  const loadRequest = useCallback(async () => {
    try {
      const { data } = await api.get(`/requests/${requestId}`);
      setRequest(data.request);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [requestId]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  useEffect(() => {
    if (!request) return;
    (async () => {
      try {
        const { data } = await api.get('/catalog/services');
        const match = data.serviceTypes.find((s) => s.id === request.serviceTypeId);
        if (match) setServiceName(match.name);
      } catch {
        // non-critical -- the screen still works without a friendly service name
      }
    })();
  }, [request?.serviceTypeId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join:request', { requestId });
    function onStatus({ request: updated }) {
      if (updated.id === requestId) setRequest(updated);
    }
    socket.on('request:status', onStatus);
    socket.on('request:assigned', onStatus);
    return () => {
      socket.off('request:status', onStatus);
      socket.off('request:assigned', onStatus);
    };
  }, [requestId]);

  useLocationTracking(!!request && request.status !== 'COMPLETED' && request.status !== 'CANCELLED', requestId);

  async function advanceStatus(next) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.patch(`/requests/${requestId}/status`, { status: next });
      setRequest(data.request);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function completeJob() {
    if (otp.trim().length < 4) {
      setError('Enter the completion code given by the customer.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/requests/${requestId}/complete`, { otp: otp.trim() });
      setRequest(data.request);
      setCompletedSummary(data.request.finalPrice);
      await refreshProfile();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function openNavigation() {
    if (!request) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${request.pickupLat},${request.pickupLng}`;
    Linking.openURL(url);
  }

  if (!request) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
      </SafeAreaView>
    );
  }

  if (completedSummary != null) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { padding: spacing(6) }]}>
        <Text style={styles.completedTitle}>Job completed</Text>
        <Text style={styles.completedAmount}>\u20B9{completedSummary}</Text>
        <Text style={styles.completedSubtitle}>Added to your earnings.</Text>
        <Button title="Back to home" onPress={() => navigation.popToTop()} style={{ marginTop: spacing(7) }} />
      </SafeAreaView>
    );
  }

  const step = NEXT_STEP[request.status];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.requestNumber}>{request.requestNumber}</Text>
            <Text style={styles.serviceName}>{serviceName || 'Service request'}</Text>
          </View>
          <StatusPill status={request.status} />
        </View>

        {request.isSos && <Text style={styles.sosTag}>Emergency SOS request</Text>}

        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Pickup</Text>
          <Text style={styles.detailValue}>{request.pickupAddress || `${request.pickupLat.toFixed(4)}, ${request.pickupLng.toFixed(4)}`}</Text>
          {request.customerNotes && (
            <>
              <Text style={[styles.detailLabel, { marginTop: spacing(3) }]}>Customer notes</Text>
              <Text style={styles.detailValue}>{request.customerNotes}</Text>
            </>
          )}
          <Text style={[styles.detailLabel, { marginTop: spacing(3) }]}>Estimated payout</Text>
          <Text style={styles.detailValue}>\u20B9{request.estimatedPrice}</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={openNavigation}>
            <Text style={styles.secondaryButtonText}>Open in Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Chat', { requestId })}>
            <Text style={styles.secondaryButtonText}>Chat with customer</Text>
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={{ flex: 1 }} />

        {step && <Button title={step.label} onPress={() => advanceStatus(step.next)} loading={busy} />}

        {request.status === 'IN_PROGRESS' && (
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>Ask the customer for their completion code</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter code"
              keyboardType="number-pad"
              style={styles.otpInput}
              placeholderTextColor={colors.textSecondary}
            />
            <Button title="Complete job" onPress={completeJob} loading={busy} style={{ marginTop: spacing(3) }} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: spacing(6) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  requestNumber: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary },
  serviceName: { fontFamily: fonts.displayBold, fontSize: 19, color: colors.textPrimary, marginTop: spacing(1) },
  sosTag: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.sos, marginTop: spacing(2) },
  detailCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(5), marginTop: spacing(5) },
  detailLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  detailValue: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary, marginTop: spacing(1) },
  actionsRow: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(5) },
  secondaryButton: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginTop: spacing(4) },
  otpSection: { marginTop: spacing(4) },
  otpLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginBottom: spacing(2) },
  otpInput: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 4,
    color: colors.textPrimary,
  },
  completedTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.textPrimary },
  completedAmount: { fontFamily: fonts.displayBold, fontSize: 36, color: colors.online, marginTop: spacing(3) },
  completedSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: spacing(2) },
});
