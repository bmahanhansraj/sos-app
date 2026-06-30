import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api, apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import ServiceCard from '../../components/ServiceCard';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

const FALLBACK_LOCATION = { lat: 28.6139, lng: 77.209 }; // central Delhi, used if permission is denied

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Finding your location...');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      const { data } = await api.get('/catalog/services');
      setServices(data.serviceTypes);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadServices();
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation(FALLBACK_LOCATION);
          setLocationLabel('Location permission denied — using a default pickup point');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel('Using your current location');
      } catch {
        setLocation(FALLBACK_LOCATION);
        setLocationLabel('Could not get GPS — using a default pickup point');
      }
    })();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  }

  function goToService(service, isSos = false) {
    if (!location) return;
    navigation.navigate('Quote', { service, pickup: location, isSos });
  }

  const sosService = services.find((s) => s.isEmergencySos) || services.find((s) => s.code === 'ROADSIDE_SOS');

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.greeting}>Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
        <Text style={styles.locationLabel}>{locationLabel}</Text>

        {sosService && (
          <TouchableOpacity
            onPress={() => goToService(sosService, true)}
            activeOpacity={0.85}
            style={styles.sosCard}
          >
            <View style={styles.sosTextWrap}>
              <Text style={styles.sosTitle}>Need help right now?</Text>
              <Text style={styles.sosSubtitle}>Tap for emergency roadside assistance</Text>
            </View>
            <View style={styles.sosButton}>
              <Text style={styles.sosButtonText}>SOS</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>What do you need?</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {services.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing(8) }} />
        ) : (
          <View style={styles.grid}>
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} onPress={() => goToService(service)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(6), paddingBottom: spacing(12) },
  greeting: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary },
  locationLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: spacing(1), marginBottom: spacing(6) },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sosSoft,
    borderRadius: radius.lg,
    padding: spacing(5),
    marginBottom: spacing(7),
  },
  sosTextWrap: { flex: 1, paddingRight: spacing(3) },
  sosTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.accentDeep },
  sosSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.accentDeep, opacity: 0.75, marginTop: spacing(1) },
  sosButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonText: { fontFamily: fonts.display, fontSize: 13, color: '#fff' },
  sectionTitle: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.textPrimary, marginBottom: spacing(4) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 13, marginBottom: spacing(3) },
});
