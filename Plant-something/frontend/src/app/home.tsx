import { router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { clearSession, loadSession } from '@/lib/auth0';

export default function HomeScreen() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof loadSession>>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const existing = await loadSession();
      setSession(existing);
      setReady(true);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (ready && !session?.accessToken) {
      router.replace('/');
    }
  }, [ready, session]);

  const signOut = async () => {
    await AuthSession.dismiss();
    await clearSession();
    setSession(null);
    router.replace('/');
  };

  if (!ready || !session?.accessToken) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1f7a3d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plant Something</Text>
        <Text style={styles.subtitle}>Grow your garden, one find at a time.</Text>
      </View>

      <View style={styles.authRow}>
        <Text style={styles.authStatus}>You are signed in.</Text>
        <TouchableOpacity
          style={[styles.authButton, styles.secondaryAuthButton]}
          onPress={signOut}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryAuthButtonText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.gardenButton]}
          onPress={() => router.push('/garden')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>🌼 Go to Garden</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.findButton]}
          onPress={() => router.push('/camera')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>📷 I found a plant!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fff8',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f7a3d',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#4a7c59',
    textAlign: 'center',
  },
  authRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  authStatus: {
    color: '#1b4d2e',
    fontSize: 14,
    fontWeight: '600',
  },
  authButton: {
    minWidth: 160,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#1f7a3d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAuthButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1f7a3d',
  },
  secondaryAuthButtonText: {
    color: '#1f7a3d',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gardenButton: {
    backgroundColor: '#4a7c59',
  },
  findButton: {
    backgroundColor: '#1f7a3d',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});