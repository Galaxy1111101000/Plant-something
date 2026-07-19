import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getAuth0Config, loadSession, saveSession } from '@/lib/auth0';

export default function SignInScreen() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof loadSession>>>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setSession(await loadSession());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load session.');
      } finally {
        setReady(true);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (ready && session?.accessToken) {
      router.replace('/home');
    }
  }, [ready, session]);

  const signIn = async () => {
    if (signingIn) {
      return;
    }

    setSigningIn(true);
    const config = getAuth0Config();

    if (!config) {
      setError('Set EXPO_PUBLIC_AUTH0_DOMAIN and EXPO_PUBLIC_AUTH0_CLIENT_ID in your environment.');
      setSigningIn(false);
      return;
    }

    try {
      const discovery = await AuthSession.fetchDiscoveryAsync(`https://${config.domain}`);
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'plantapp', path: 'redirect' });
      const request = await AuthSession.loadAsync(
        {
          responseType: AuthSession.ResponseType.Code,
          clientId: config.clientId,
          redirectUri,
          scopes: ['openid', 'profile', 'email'],
          extraParams: {
            ...(config.audience ? { audience: config.audience } : {}),
            // Force Universal Login instead of silently reusing an existing SSO session.
            prompt: 'login',
          },
          usePKCE: true,
        },
        discovery,
      );

      if (request.codeVerifier) {
        await AsyncStorage.setItem('auth0_code_verifier', request.codeVerifier);
      }

      const result = await request.promptAsync(discovery);

      if (result.type !== 'success' || !result.params.code) {
        setError(null);
        return;
      }

      const exchangeResult = await AuthSession.exchangeCodeAsync(
        {
          code: result.params.code,
          clientId: config.clientId,
          redirectUri,
          extraHeaders: {},
          extraParams: {
            code_verifier: request.codeVerifier || '',
          },
        },
        discovery,
      );

      await AuthSession.dismiss();

      const nextSession = {
        accessToken: exchangeResult.accessToken,
        idToken: exchangeResult.idToken,
        refreshToken: exchangeResult.refreshToken,
        tokenType: exchangeResult.tokenType,
        expiresIn: exchangeResult.expiresIn,
        scope: exchangeResult.scope,
      };

      await saveSession(nextSession);
      setSession(nextSession);
      setError(null);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSigningIn(false);
    }
  };

  if (!ready) {
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
        <Text style={styles.subtitle}>Sign in first to unlock your garden.</Text>
      </View>

      <View style={styles.authCard}>
        <Text style={styles.authTitle}>Welcome</Text>
        <Text style={styles.authBody}>Authenticate with Auth0 before entering the app.</Text>
        <TouchableOpacity style={styles.authButton} onPress={signIn} activeOpacity={0.8} disabled={signingIn}>
          <Text style={styles.authButtonText}>{signingIn ? 'Signing in...' : 'Sign in'}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    marginBottom: 32,
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
  authCard: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  authTitle: {
    color: '#1b4d2e',
    fontSize: 22,
    fontWeight: '700',
  },
  authBody: {
    color: '#4a7c59',
    textAlign: 'center',
    fontSize: 15,
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
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    width: '100%',
    color: '#b42318',
    textAlign: 'center',
    marginTop: 16,
  },
});