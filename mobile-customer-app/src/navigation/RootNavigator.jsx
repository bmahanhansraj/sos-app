import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../theme/tokens';

import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import HomeScreen from '../screens/home/HomeScreen';
import QuoteScreen from '../screens/booking/QuoteScreen';
import PaymentScreen from '../screens/booking/PaymentScreen';
import TrackingScreen from '../screens/booking/TrackingScreen';
import ChatScreen from '../screens/booking/ChatScreen';
import RatingScreen from '../screens/booking/RatingScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const RootStackNav = createNativeStackNavigator();
const AuthStackNav = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <AuthStackNav.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </AuthStackNav.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tabs.Screen name="HistoryTab" component={HistoryScreen} options={{ title: 'History' }} />
      <Tabs.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tabs.Navigator>
  );
}

const screenHeaderOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTitleStyle: { fontFamily: fonts.displayMedium, color: colors.textPrimary },
  headerTintColor: colors.textPrimary,
  headerShadowVisible: false,
};

// A single root stack wraps the tab navigator, so both the Home tab and the
// History tab can push into the same booking-flow screens (Quote, Payment,
// Tracking, Chat, Rating) -- a screen registered on an ancestor navigator is
// reachable from any descendant via navigation.navigate(name).
function MainStack() {
  return (
    <RootStackNav.Navigator screenOptions={screenHeaderOptions}>
      <RootStackNav.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStackNav.Screen name="Quote" component={QuoteScreen} options={{ title: 'Booking' }} />
      <RootStackNav.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <RootStackNav.Screen name="Tracking" component={TrackingScreen} options={{ title: 'Track request' }} />
      <RootStackNav.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <RootStackNav.Screen name="Rating" component={RatingScreen} options={{ title: 'Rate your service', headerBackVisible: false }} />
    </RootStackNav.Navigator>
  );
}

export default function RootNavigator() {
  const { token, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <NavigationContainer>{token ? <MainStack /> : <AuthStack />}</NavigationContainer>;
}
