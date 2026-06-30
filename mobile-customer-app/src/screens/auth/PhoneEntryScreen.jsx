import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function PhoneEntryScreen({ navigation }) {
  const { requestOtp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [phone, setPhone] = useState('+91');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    setError('');
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setBusy(true);
    const purpose = mode === 'login' ? 'LOGIN' : 'SIGNUP';
    const result = await requestOtp(phone.trim(), purpose, mode === 'signup' ? 'CUSTOMER' : undefined);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    navigation.navigate('OtpVerify', { phone: phone.trim(), purpose, name: name.trim(), debugOtp: result.debugOtp });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.tagline}>Roadside help, on the way.</Text>

          <View style={styles.toggleRow}>
            <Text
              onPress={() => setMode('login')}
              style={[styles.toggleItem, mode === 'login' && styles.toggleItemActive]}
            >
              Log in
            </Text>
            <Text
              onPress={() => setMode('signup')}
              style={[styles.toggleItem, mode === 'signup' && styles.toggleItemActive]}
            >
              Sign up
            </Text>
          </View>

          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                style={styles.input}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+919876543210"
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Button title={busy ? 'Sending code...' : 'Continue'} onPress={handleContinue} disabled={busy} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing(6), justifyContent: 'center' },
  brand: { alignItems: 'flex-start', marginBottom: spacing(2) },
  logoImage: { width: 180, height: 100 },
  tagline: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, marginBottom: spacing(8) },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing(1),
    marginBottom: spacing(6),
  },
  toggleItem: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing(2.5),
    borderRadius: radius.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleItemActive: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  field: { marginBottom: spacing(4) },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, marginBottom: spacing(1.5) },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textPrimary,
  },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginBottom: spacing(3) },
});
