import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, List, Wallet, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.text2,
        tabBarStyle: {
          backgroundColor: 'rgba(10,12,20,0.96)',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          // Add the system gesture/nav-bar inset so labels clear it.
          height: 64 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: ({ color, size }) => <List color={color} size={size} /> }} />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <Menu color={color} size={size} /> }} />
    </Tabs>
  );
}
