import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { FONT_ASSETS } from '../components/ui/AppText';
import { View, ActivityIndicator } from 'react-native';
import { AppProvider, useApp } from '../context/AppContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { Colors, createStyles } from '../constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { currentUser, hydrated } = useApp();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accentLight} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bgPrimary } }}>
      <Stack.Protected guard={!!currentUser}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!currentUser}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

// Remounts the navigator whenever the theme switches (`version`) so every
// screen re-reads Colors/createStyles. AppProvider sits above, so data and
// session state survive the switch.
function ThemedApp() {
  const { scheme, version } = useTheme();
  useEffect(() => { SystemUI.setBackgroundColorAsync(Colors.bgPrimary).catch(() => {}); }, [version]);
  return (
    <>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <React.Fragment key={version}>
        <RootNavigator />
      </React.Fragment>
    </>
  );
}

export default function RootLayout() {
  // Splash stays up until the typeface is ready, so text never flashes in the system font.
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  if (!fontsLoaded && !fontError) return null;
  return (
    <ThemeProvider>
      <AppProvider>
        <ThemedApp />
      </AppProvider>
    </ThemeProvider>
  );
}

const styles = createStyles(() => ({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgPrimary },
}));
