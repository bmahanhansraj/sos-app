import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme/tokens';

export default function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        isPrimary && { backgroundColor: colors.accent },
        isDanger && { backgroundColor: colors.sos },
        isOutline && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.textPrimary : '#fff'} />
      ) : (
        <Text
          style={[
            styles.label,
            isOutline ? { color: colors.textPrimary } : { color: isPrimary ? colors.textOnAccent : '#fff' },
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
