import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function OtpVerifyScreen({ route, navigation }) {
  const { phone, purpose, name, debugOtp } = route.params;
  const { verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleVerify() {
    setError('');
    setBusy(true);
    const extra = purpose === 'SIGNUP' ? { role: 'CUSTOMER', name } : {};
    const result = await verifyOtp(phone, code.trim(), purpose, extra);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    // Navigator swaps to the main app automatically once `token` is set.
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"
          keyboardType="number-pad"
          maxLength={8}
          autoFocus
          style={styles.codeInput}
          placeholderTextColor={colors.textSecondary}
        />

        {debugOtp && (
          <Text style={styles.debugHint}>Demo mode — your code is {debugOtp}</Text>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button title={busy ? 'Verifying...' : 'Verify & continue'} onPress={handleVerify} disabled={busy} loading={busy} />

        <Text style={styles.back} onPress={() => navigation.goBack()}>
          Use a different number
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing(6), justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary, marginBottom: spacing(2) },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing(8) },
  codeInput: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    letterSpacing: 6,
    color: colors.textPrimary,
    marginBottom: spacing(3),
  },
  debugHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accentDeep,
    backgroundColor: colors.accentSoft,
    padding: spacing(3),
    borderRadius: radius.sm,
    marginBottom: spacing(4),
  },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginBottom: spacing(3) },
  back: { textAlign: 'center', marginTop: spacing(5), color: colors.textSecondary, fontFamily: fonts.body, fontSize: 13 },
});
