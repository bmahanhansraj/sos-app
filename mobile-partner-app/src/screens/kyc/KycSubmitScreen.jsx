import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api, apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

const DOCUMENT_TYPES = ['DRIVING_LICENSE', 'AADHAAR', 'PAN'];
const VEHICLE_TYPES = [
  'TWO_WHEELER', 'THREE_WHEELER', 'FOUR_WHEELER_HATCH', 'FOUR_WHEELER_SEDAN',
  'FOUR_WHEELER_SUV', 'COMMERCIAL', 'TOW_TRUCK_FLATBED', 'TOW_TRUCK_CRANE',
];

export default function KycSubmitScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const [documentType, setDocumentType] = useState('DRIVING_LICENSE');
  const [documentNumber, setDocumentNumber] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [vehicleType, setVehicleType] = useState('TWO_WHEELER');
  const [vehicleRegNumber, setVehicleRegNumber] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pickPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is needed to capture your document.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function submit() {
    setError('');
    if (!documentNumber.trim() || !name.trim() || !vehicleRegNumber.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setBusy(true);
    try {
      // No real object storage in this demo -- a production build would
      // upload `photoUri` to S3/Cloud Storage first and send the resulting
      // URL here. We send a placeholder so the KYC record still reflects
      // that a document was captured.
      await api.post('/partners/kyc', {
        documentType,
        documentNumber: documentNumber.trim(),
        name: name.trim(),
        vehicleType,
        vehicleRegNumber: vehicleRegNumber.trim().toUpperCase(),
        documents: photoUri ? [{ type: documentType, url: `local://${documentType.toLowerCase()}.jpg` }] : [],
      });
      await refreshProfile();
      navigation.goBack();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Verify your identity</Text>
        <Text style={styles.subtitle}>This is reviewed by our team before you can go online and accept jobs.</Text>

        <Text style={styles.label}>Document type</Text>
        <View style={styles.chipRow}>
          {DOCUMENT_TYPES.map((t) => (
            <TouchableOpacity key={t} onPress={() => setDocumentType(t)} style={[styles.chip, documentType === t && styles.chipActive]}>
              <Text style={[styles.chipText, documentType === t && styles.chipTextActive]}>{t.replaceAll('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Full name (as on document)</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>Document number</Text>
        <TextInput value={documentNumber} onChangeText={setDocumentNumber} style={styles.input} placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />

        <Text style={styles.label}>Vehicle type</Text>
        <View style={styles.chipRow}>
          {VEHICLE_TYPES.map((t) => (
            <TouchableOpacity key={t} onPress={() => setVehicleType(t)} style={[styles.chip, vehicleType === t && styles.chipActive]}>
              <Text style={[styles.chipText, vehicleType === t && styles.chipTextActive]}>{t.replaceAll('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Vehicle registration number</Text>
        <TextInput value={vehicleRegNumber} onChangeText={setVehicleRegNumber} style={styles.input} placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />

        <Text style={styles.label}>Document photo</Text>
        <TouchableOpacity onPress={pickPhoto} style={styles.photoPicker}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoPickerText}>Tap to take a photo</Text>
          )}
        </TouchableOpacity>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button title={busy ? 'Submitting...' : 'Submit for review'} onPress={submit} loading={busy} style={{ marginTop: spacing(4) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(6), paddingBottom: spacing(10) },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.textPrimary },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: spacing(1), marginBottom: spacing(6) },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, marginBottom: spacing(2), marginTop: spacing(4) },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  chip: { paddingVertical: spacing(2), paddingHorizontal: spacing(3.5), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textPrimary },
  chipTextActive: { color: colors.textOnAccent },
  photoPicker: {
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPickerText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  photoPreview: { width: '100%', height: '100%' },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginTop: spacing(4) },
});
