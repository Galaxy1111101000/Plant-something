import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View, Text } from "react-native";
import * as Linking from "expo-linking";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { saveSession, getAuth0Config } from "@/lib/auth0";

export default function RedirectScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("Processing authentication...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Get the URL that opened the app
        const initialUrl = await Linking.getInitialURL();

        if (!initialUrl) {
          setError("No redirect URL received.");
          return;
        }

        // Parse the redirect URL
        const parsed = Linking.parse(initialUrl);
        const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
        const state = typeof parsed.queryParams?.state === "string" ? parsed.queryParams.state : null;
        const errorParam = typeof parsed.queryParams?.error === "string" ? parsed.queryParams.error : null;

        if (errorParam) {
          setError(`Authentication error: ${errorParam}`);
          return;
        }

        if (!code) {
          setError("No authorization code received.");
          return;
        }

        setMessage("Exchanging code for token...");

        const config = getAuth0Config();
        if (!config) {
          setError("Auth0 configuration missing.");
          return;
        }

        // Retrieve the code verifier from storage
        const codeVerifier = await AsyncStorage.getItem("auth0_code_verifier");
        if (!codeVerifier) {
          setError("Code verifier not found. Please try signing in again.");
          return;
        }

        // Fetch discovery
        const discovery = await AuthSession.fetchDiscoveryAsync(`https://${config.domain}`);

        // Exchange code for tokens
        const exchangeResult = await AuthSession.exchangeCodeAsync(
          {
            code,
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            extraHeaders: {},
            extraParams: {
              code_verifier: codeVerifier,
            },
          },
          discovery,
        );

        setMessage("Saving session...");

        // Save the session
        await saveSession({
          accessToken: exchangeResult.accessToken,
          idToken: exchangeResult.idToken,
          refreshToken: exchangeResult.refreshToken,
          tokenType: exchangeResult.tokenType,
          expiresIn: exchangeResult.expiresIn,
          scope: exchangeResult.scope,
        });

        // Clear the stored code verifier
        await AsyncStorage.removeItem("auth0_code_verifier");

        // Dismiss the auth session (close the browser/popup)
        await AuthSession.dismiss();

        setMessage("Redirecting...");

        // Navigate back to home after a brief delay
        setTimeout(() => {
          router.replace("/");
        }, 500);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error during authentication.";
        setError(errorMsg);
        console.error("Redirect error:", errorMsg);
      }
    };

    handleRedirect();
  }, [router]);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.errorHint}>The authentication process encountered an issue. Please try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#1f7a3d" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6fff8",
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: "#1b4d2e",
  },
  error: {
    fontSize: 16,
    color: "#b42318",
    textAlign: "center",
    paddingHorizontal: 24,
    fontWeight: "600",
  },
  errorHint: {
    marginTop: 8,
    fontSize: 14,
    color: "#46624b",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
