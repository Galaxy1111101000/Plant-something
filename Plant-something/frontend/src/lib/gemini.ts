import { Platform } from "react-native";

export interface PlantInfo {
  answer: string;
}

export function getBackendUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3001";
  }

  return "http://localhost:3001";
}

async function postToBackend<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${getBackendUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Request to backend failed.");
  }

  return data as T;
}

export async function getGeminiPlantInfo(plantName: string): Promise<PlantInfo> {
  const data = await postToBackend<{ answer?: string }>('/api/chatbot', { plantName });

  if (typeof data.answer === "string" && data.answer.length > 0) {
    return { answer: data.answer };
  }

  throw new Error("Invalid chatbot response from the backend.");
}

export async function identifyPlantWithBackend(imageBase64: string) {
  return postToBackend<{ result?: { classification?: { suggestions?: Array<{ name?: string; common_name?: string }> } } }>('/api/identify-plant', {
    imageBase64
  });
}