import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { api, apiErrorMessage } from '../../api/client';
import { getSocket } from '../../api/socket';
import StatusPill from '../../components/StatusPill';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

const TERMINAL = ['COMPLETED', 'CANCELLED', 'NO_PARTNER_FOUND'];

export default function TrackingScreen({ route, navigation }) {
  const { requestId, noPartnerFound } = route.params;
  const [request, setRequest] = useState(null);
  const [partner, setPartner] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const mapRef = useRef(null);

  const loadRequest = useCallback(async () => {
    try {
      const { data } = await api.get(`/requests/${requestId}`);
      setRequest(data.request);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [requestId]);

  const loadPartnerLocation = useCallback(async () => {
    try {
      const { data } = await api.get(`/requests/${requestId}/partner-location`);
      if (data.partner) setPartner(data.partner);
    } catch {
      // no partner assigned yet; not an error state worth surfacing
    }
  }, [requestId]);

  useEffect(() => {
    loadRequest();
    loadPartnerLocation();
    const interval = setInterval(loadPartnerLocation, 8000);
    return () => clearInterval(interval);
  }, [loadRequest, loadPartnerLocation]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join:request', { requestId });

    function onStatus({ request: updated }) {
      if (updated.id === requestId) setRequest(updated);
    }
    function onLocation(payload) {
      setPartner((prev) => (prev ? { ...prev, lat: payload.lat, lng: payload.lng } : prev));
    }
    socket.on('request:status', onStatus);
    socket.on('partner:location', onLocation);
    return () => {
      socket.off('request:status', onStatus);
      socket.off('partner:location', onLocation);
    };
  }, [requestId]);

  async function handleCancel() {
    Alert.alert('Cancel request?', 'This will cancel your booking.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await api.post(`/requests/${requestId}/cancel`, { reason: 'Cancelled by customer' });
            await loadRequest();
          } catch (err) {
            setError(apiErrorMessage(err));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  if (!request) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
      </SafeAreaView>
    );
  }

  if (request.status === 'NO_PARTNER_FOUND' || noPartnerFound) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { padding: spacing(6) }]}>
        <Text style={styles.emptyTitle}>No partners available right now</Text>
        <Text style={styles.emptySubtitle}>Your payment was not charged for dispatch. Please try again shortly.</Text>
        <Button title="Back to home" onPress={() => navigation.popToTop()} style={{ marginTop: spacing(6) }} />
      </SafeAreaView>
    );
  }

  const isActive = !TERMINAL.includes(request.status);
  const isPreAssignment = request.status === 'REQUESTED';

  return (
    <SafeAreaView style={styles.screen}>
      {isActive && partner?.lat && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: request.pickupLat,
            longitude: request.pickupLng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker coordinate={{ latitude: request.pickupLat, longitude: request.pickupLng }} pinColor={colors.accent} title="Pickup" />
          <Marker coordinate={{ latitude: partner.lat, longitude: partner.lng }} pinColor={colors.highlightDeep} title={partner.name} />
        </MapView>
      )}

      <View style={[styles.sheet, !partner?.lat && { flex: 1 }]}>
        <View style={styles.sheetHeader}>
          <StatusPill status={request.status} />
          {request.isSos && <Text style={styles.sosTag}>SOS</Text>}
        </View>

        {isPreAssignment ? (
          <View style={styles.searching}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.searchingText}>Looking for the nearest available partner...</Text>
          </View>
        ) : (
          <View style={styles.partnerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerName}>{partner?.name || 'Service partner'}</Text>
              <Text style={styles.partnerMeta}>
                {partner?.vehicleType?.replaceAll('_', ' ') || ''} {partner?.avgRating ? `\u2605 ${partner.avgRating.toFixed(1)}` : ''}
              </Text>
            </View>
            {partner?.phone && (
              <TouchableOpacity style={styles.iconButton} onPress={() => Linking.openURL(`tel:${partner.phone}`)}>
                <Text style={styles.iconButtonText}>Call</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Chat', { requestId })}>
              <Text style={styles.iconButtonText}>Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {request.status === 'ARRIVED' && (
          <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>Completion code — share with your partner once the job is done</Text>
            <Text style={styles.otpValue}>{request.completionOtp}</Text>
          </View>
        )}

        {request.status === 'COMPLETED' && (
          <View style={{ marginTop: spacing(2) }}>
            <Text style={styles.completedText}>This request is complete.</Text>
            <Button title="Rate this service" onPress={() => navigation.replace('Rating', { requestId })} style={{ marginTop: spacing(4) }} />
          </View>
        )}

        {request.status === 'CANCELLED' && <Text style={styles.completedText}>This request was cancelled.</Text>}

        {!!error && <Text style={styles.error}>{error}</Text>}

        {['REQUESTED', 'ASSIGNED'].includes(request.status) && (
          <Button
            title="Cancel request"
            variant="outline"
            onPress={handleCancel}
            loading={cancelling}
            style={{ marginTop: spacing(5) }}
          />
        )}

        {isActive && (
          <TouchableOpacity onPress={() => navigation.popToTop()} style={{ marginTop: spacing(4) }}>
            <Text style={styles.backHome}>Back to home (we'll keep tracking in the background)</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  sheet: { padding: spacing(6), backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(4) },
  sosTag: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.sos },
  searching: { alignItems: 'center', paddingVertical: spacing(8) },
  searchingText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: spacing(3) },
  partnerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  partnerName: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.textPrimary },
  partnerMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing(0.5) },
  iconButton: { paddingVertical: spacing(2.5), paddingHorizontal: spacing(4), borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  iconButtonText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accentDeep },
  otpCard: { backgroundColor: colors.highlightSoft, borderRadius: radius.md, padding: spacing(4), marginTop: spacing(5) },
  otpLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.highlightDeep },
  otpValue: { fontFamily: fonts.display, fontSize: 26, color: colors.highlightDeep, letterSpacing: 4, marginTop: spacing(1) },
  completedText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginTop: spacing(3) },
  backHome: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  emptyTitle: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing(2) },
});
