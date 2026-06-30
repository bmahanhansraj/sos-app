import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors, statusColor, statusLabel, fonts, radius, spacing } from '../theme/tokens';

const LIVE_STATES = ['REQUESTED', 'EN_ROUTE', 'IN_PROGRESS'];

export default function StatusPill({ status }) {
  const color = statusColor[status] || colors.textSecondary;
  const label = statusLabel[status] || status;
  const isLive = LIVE_STATES.includes(status);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isLive]);

  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A`, borderColor: `${color}40` }]}>
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: isLive ? pulse : 1 }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
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
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
