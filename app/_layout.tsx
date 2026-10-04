import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDb } from '../db';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { UnitProvider } from '../contexts/UnitContext';

function RootLayoutNav() {
  const { scheme, colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setStyle(scheme === 'dark' ? 'light' : 'dark');
    }
  }, [scheme]);

  const navigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
      notification: colors.danger,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    getDb().catch((error) => {
      console.error('Failed to initialize database', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UnitProvider>
          <RootLayoutNav />
        </UnitProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
