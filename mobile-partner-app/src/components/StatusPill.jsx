import { View, Text, StyleSheet } from 'react-native';
import { colors, statusColor, fonts, radius, spacing } from '../theme/tokens';

const LABELS = {
  REQUESTED: 'Requested',
  ASSIGNED: 'Assigned to you',
  EN_ROUTE: 'You are en route',
  ARRIVED: 'You have arrived',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_PARTNER_FOUND: 'No partner found',
};

export default function StatusPill({ status }) {
  const color = statusColor[status] || colors.textSecondary;
  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A`, borderColor: `${color}40` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{LABELS[status] || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13 },
});
