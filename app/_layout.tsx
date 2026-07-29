import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { getDb } from '../db';

export default function RootLayout() {
  useEffect(() => {
    getDb().catch((error) => {
      console.error('Failed to initialize database', error);
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
