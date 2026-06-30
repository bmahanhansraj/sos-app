import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { JobOfferProvider } from '../context/JobOfferContext';
import JobOfferModal from '../components/JobOfferModal';
import { colors, fonts } from '../theme/tokens';

import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import KycSubmitScreen from '../screens/kyc/KycSubmitScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ActiveJobScreen from '../screens/job/ActiveJobScreen';
import ChatScreen from '../screens/job/ChatScreen';
import EarningsScreen from '../screens/earnings/EarningsScreen';
import RatingsScreen from '../screens/earnings/RatingsScreen';
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
      <Tabs.Screen name="EarningsTab" component={EarningsScreen} options={{ title: 'Earnings' }} />
      <Tabs.Screen name="RatingsTab" component={RatingsScreen} options={{ title: 'Ratings' }} />
      <Tabs.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tabs.Navigator>
  );
}

const screenHeaderOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTitleStyle: { fontFamily: fonts.display, color: colors.textPrimary },
  headerTintColor: colors.textPrimary,
  headerShadowVisible: false,
};

function MainStack() {
  return (
    <RootStackNav.Navigator screenOptions={screenHeaderOptions}>
      <RootStackNav.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStackNav.Screen name="KycSubmit" component={KycSubmitScreen} options={{ title: 'Verify identity' }} />
      <RootStackNav.Screen name="ActiveJob" component={ActiveJobScreen} options={{ title: 'Current job', headerBackVisible: false }} />
      <RootStackNav.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
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

  if (!token) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  return (
    <JobOfferProvider>
      <NavigationContainer>
        <MainStack />
      </NavigationContainer>
      <JobOfferModal />
    </JobOfferProvider>
  );
}
