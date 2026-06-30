import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme/tokens';

export default function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';
  const isOnline = variant === 'online';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        isPrimary && { backgroundColor: colors.accent },
        isDanger && { backgroundColor: colors.sos },
        isOnline && { backgroundColor: colors.online },
        isOutline && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.textPrimary : colors.background} />
      ) : (
        <Text
          style={[
            styles.label,
            isOutline ? { color: colors.textPrimary } : { color: colors.textOnAccent },
            isOnline && { color: colors.background },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
});
