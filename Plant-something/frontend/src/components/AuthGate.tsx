import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, AppState } from "react-native";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearSession, getAuth0Config, loadSession, saveSession } from "@/lib/auth0";

const useProxy = true;

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Awaited<ReturnType<typeof loadSession>>>(null);
  const [error, setError] = useState<string | null>(null);

  // Reload session from storage
  const reloadSession = async () => {
    try {
      const existing = await loadSession();
      if (existing?.accessToken) {
        setSession(existing);
      }
    } catch (err) {
      console.error("Error reloading session:", err);
    }
  };

  // Bootstrap and load existing session
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const existing = await loadSession();
        setSession(existing);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load session.");
      } finally {
        setReady(true);
      }
    };

    bootstrap();
  }, []);

  // Listen for app state changes (foreground) and reload session
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // App came to foreground, reload session
        reloadSession();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const signIn = async () => {
    const config = getAuth0Config();

    if (!config) {
      setError("Set EXPO_PUBLIC_AUTH0_DOMAIN and EXPO_PUBLIC_AUTH0_CLIENT_ID in your environment.");
      return;
    }

    try {
      const discovery = await AuthSession.fetchDiscoveryAsync(`https://${config.domain}`);
      const redirectUri = AuthSession.makeRedirectUri({ scheme: "plantapp", path: "redirect" });
      const request = await AuthSession.loadAsync(
        {
          responseType: AuthSession.ResponseType.Code,
          clientId: config.clientId,
          redirectUri,
          scopes: ["openid", "profile", "email"],
          extraParams: config.audience ? { audience: config.audience } : {},
          usePKCE: true,
        },
        discovery,
      );

      // Store the code verifier for the redirect screen to use
      if (request.codeVerifier) {
        await AsyncStorage.setItem("auth0_code_verifier", request.codeVerifier);
      }

      console.log("Auth0 redirect URI:", redirectUri);
      const result = await request.promptAsync(discovery);

      if (result.type === "success" && result.params.code) {
        const exchangeResult = await AuthSession.exchangeCodeAsync(
          {
            code: result.params.code,
            clientId: config.clientId,
            redirectUri,
            extraHeaders: {},
            extraParams: {
              code_verifier: request.codeVerifier || "",
            },
          },
          discovery,
        );

        // Close the auth session browser/popup
        await AuthSession.dismiss();

        await saveSession({
          accessToken: exchangeResult.accessToken,
          idToken: exchangeResult.idToken,
          refreshToken: exchangeResult.refreshToken,
          tokenType: exchangeResult.tokenType,
          expiresIn: exchangeResult.expiresIn,
          scope: exchangeResult.scope,
        });
        setSession({
          accessToken: exchangeResult.accessToken,
          idToken: exchangeResult.idToken,
          refreshToken: exchangeResult.refreshToken,
          tokenType: exchangeResult.tokenType,
          expiresIn: exchangeResult.expiresIn,
          scope: exchangeResult.scope,
        });
        setError(null);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    }
  };

  const signOut = async () => {
    await clearSession();
    setSession(null);
    setError(null);
  };

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1f7a3d" />
      </View>
    );
  }

  if (!session?.accessToken) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Plant App</Text>
        <Text style={styles.subtitle}>Sign in to continue to your camera and plant insights.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={signIn}>
          <Text style={styles.buttonText}>Sign in with Auth0</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>Signed in</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f6fff8",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1b4d2e",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#46624b",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1f7a3d",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f7a3d",
  },
  secondaryButtonText: {
    color: "#1f7a3d",
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: "#b42318",
    marginBottom: 12,
    textAlign: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },
  topBarText: {
    color: "#1b4d2e",
    fontWeight: "700",
  },
  signOutText: {
    color: "#1f7a3d",
    fontWeight: "600",
  },
});
