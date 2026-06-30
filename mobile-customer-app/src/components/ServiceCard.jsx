import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme/tokens';

const ICON_GLYPH = {
  ROADSIDE_SOS: '!',
  MECHANIC_ONSITE: '\u2699', // gear
  BATTERY_JUMPSTART: '\u26A1', // bolt
  ONSITE_BATTERY_CHARGING: '\u26A1',
  FUEL_DELIVERY: '\u26FD', // fuel pump
  FLAT_TIRE_TUBELESS: '\u25CB', // circle (tire)
  FLAT_TIRE_TUBE: '\u25CB',
  TOWING_FLATBED: '\u2191', // up arrow
  TOWING_CRANE: '\u2191',
  KEY_MAKER: '\u26BF', // key
};

export default function ServiceCard({ service, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{ICON_GLYPH[service.code] || '\u2022'}</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>{service.name}</Text>
      <Text style={styles.price}>From \u20B9{service.basePrice}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  icon: {
    fontSize: 20,
    color: colors.accentDeep,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing(1),
  },
  price: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
