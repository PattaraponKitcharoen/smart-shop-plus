import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase } from '../services/db';

export default function RootLayout() {
  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
      } catch (error) {
        console.error("Failed to init DB", error);
      }
    };
    setup();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}