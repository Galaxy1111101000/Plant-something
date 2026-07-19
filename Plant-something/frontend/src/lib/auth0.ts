import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_STORAGE_KEY = "auth0-session";

async function setSecureValue(key: string, value: string) {
  // Skip SecureStore on web, use AsyncStorage directly
  if (Platform.OS === "web") {
    return AsyncStorage.setItem(key, value);
  }
  
  try {
    return await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn("SecureStore unavailable, falling back to AsyncStorage", error);
    return AsyncStorage.setItem(key, value);
  }
}

async function getSecureValue(key: string) {
  // Skip SecureStore on web, use AsyncStorage directly
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn("SecureStore unavailable, falling back to AsyncStorage", error);
    return AsyncStorage.getItem(key);
  }
}

async function deleteSecureValue(key: string) {
  // Skip SecureStore on web, use AsyncStorage directly
  if (Platform.OS === "web") {
    return AsyncStorage.removeItem(key);
  }
  
  try {
    return await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn("SecureStore unavailable, falling back to AsyncStorage", error);
    return AsyncStorage.removeItem(key);
  }
}

type StoredSession = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  scope?: string;
};

export type Auth0Config = {
  domain: string;
  clientId: string;
  audience?: string;
  redirectUri: string;
};

export function getAuth0Config(): Auth0Config | null {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN?.trim();
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID?.trim();

  if (!domain || !clientId) {
    return null;
  }

  const audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE?.trim();

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "plantapp",
    path: "redirect",
  });

  return {
    domain,
    clientId,
    audience: audience || undefined,
    redirectUri,
  };
}

export function getDiscovery() {
  const config = getAuth0Config();

  if (!config) {
    return {
      authorizationEndpoint: "https://example.auth0.com/authorize",
      tokenEndpoint: "https://example.auth0.com/oauth/token",
      revocationEndpoint: "https://example.auth0.com/oauth/revoke",
    };
  }

  return {
    authorizationEndpoint: `https://${config.domain}/authorize`,
    tokenEndpoint: `https://${config.domain}/oauth/token`,
    revocationEndpoint: `https://${config.domain}/oauth/revoke`,
  };
}

export async function saveSession(session: StoredSession) {
  await setSecureValue(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<StoredSession | null> {
  const value = await getSecureValue(SESSION_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredSession;
  } catch {
    return null;
  }
}

export async function clearSession() {
  await deleteSecureValue(SESSION_STORAGE_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  const session = await loadSession();
  return session?.accessToken || null;
}
