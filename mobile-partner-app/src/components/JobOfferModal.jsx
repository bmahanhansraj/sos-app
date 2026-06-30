import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJobOffer } from '../context/JobOfferContext';
import { colors, fonts, spacing, radius } from '../theme/tokens';

export default function JobOfferModal() {
  const { offer, secondsLeft, responding, respond } = useJobOffer();

  return (
    <Modal visible={!!offer} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet}>
          {offer && (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>{offer.isSos ? 'Emergency SOS request' : 'New job request'}</Text>
                <View style={styles.timerRing}>
                  <Text style={styles.timerText}>{secondsLeft}</Text>
                </View>
              </View>

              <Text style={styles.requestNumber}>{offer.requestNumber}</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estimated payout</Text>
                <Text style={styles.detailValue}>\u20B9{offer.estimatedPrice}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pickup</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {offer.pickupAddress || `${offer.pickupLat.toFixed(4)}, ${offer.pickupLng.toFixed(4)}`}
                </Text>
              </View>
              {offer.distanceToPartnerKm != null && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{offer.distanceToPartnerKm.toFixed(1)} km away</Text>
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => respond('REJECT')}
                  disabled={responding}
                >
                  <Text style={styles.rejectText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => respond('ACCEPT')}
                  disabled={responding}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing(6),
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(2) },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary },
  timerRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: { fontFamily: fonts.mono, fontSize: 14, color: colors.accent },
  requestNumber: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary, marginBottom: spacing(5) },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: spacing(2.5), borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing(4) },
  detailLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  detailValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(6) },
  actionButton: { flex: 1, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rejectButton: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  rejectText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textSecondary },
  acceptButton: { backgroundColor: colors.online },
  acceptText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.background },
});
