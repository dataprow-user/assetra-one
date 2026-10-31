import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, ArrowLeftRight, Wallet, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, createStyles } from '../../../constants/theme';

// Icon with a soft pill behind it when its tab is active.
const TabIcon = ({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) => (
  <View style={[styles.pill, focused && styles.pillActive]}>
    <Icon color={color} size={21} strokeWidth={focused ? 2.4 : 2} />
  </View>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.text3,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          borderTopLeftRadius: Radius.lg,
          borderTopRightRadius: Radius.lg,
          // Add the system gesture/nav-bar inset so labels clear it.
          height: 66 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <TabIcon Icon={Home} color={color} focused={focused} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Activity', tabBarIcon: ({ color, focused }) => <TabIcon Icon={ArrowLeftRight} color={color} focused={focused} /> }} />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts', tabBarIcon: ({ color, focused }) => <TabIcon Icon={Wallet} color={color} focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, focused }) => <TabIcon Icon={Menu} color={color} focused={focused} /> }} />
    </Tabs>
  );
}

const styles = createStyles(() => ({
  pill: { width: 46, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: Colors.accentGlow },
}));
