import React, { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import LabResultsScreen from './src/screens/LabResultsScreen';
import PrescriptionsScreen from './src/screens/PrescriptionsScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import VitalsScreen from './src/screens/VitalsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

type RootStackParamList = {
  MainTabs: undefined;
  Prescriptions: undefined;
  Invoices: undefined;
  Vitals: undefined;
  Notifications: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  const [screen, setScreen] = useState<'login' | 'register'>('login');

  if (screen === 'register') {
    return <RegisterScreen onNavigateLogin={() => setScreen('login')} />;
  }
  return <LoginScreen onNavigateRegister={() => setScreen('register')} />;
}

function MainTabs({ navigation }: any) {
  const handleNavigate = (tab: string) => {
    const tabMap: Record<string, string> = {
      appointments: 'Appointments',
      lab: 'Lab Results',
      prescriptions: 'Prescriptions',
      invoices: 'Invoices',
      vitals: 'Vitals',
      notifications: 'Notifications',
    };
    const target = tabMap[tab];
    if (target) {
      // Check if it's a tab or a stack screen
      if (['Appointments', 'Lab Results'].includes(target)) {
        navigation.navigate('MainTabs', { screen: target });
      } else {
        navigation.navigate(target);
      }
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Appointments') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Lab Results') iconName = focused ? 'flask' : 'flask-outline';
          else if (route.name === 'More') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: '600', color: '#111827' },
      })}
    >
      <Tab.Screen name="Home" options={{ title: 'Home' }}>
        {() => <HomeScreen onNavigate={handleNavigate} />}
      </Tab.Screen>
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Lab Results" component={LabResultsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600', color: '#111827' },
        headerTintColor: '#2563eb',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} options={{ title: 'My Prescriptions' }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Bills & Payments' }} />
      <Stack.Screen name="Vitals" component={VitalsScreen} options={{ title: 'My Vitals' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f5ff' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return isAuthenticated ? <MainStack /> : <AuthNavigator />;
}

export default function App() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navRef}>
          <AppContent />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
