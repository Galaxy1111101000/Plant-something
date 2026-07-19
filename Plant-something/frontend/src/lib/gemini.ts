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

function getPlantApiKey() {
  return process.env.EXPO_PUBLIC_PLANT_APIKEY?.trim() || process.env.EXPO_PUBLIC_PLANT_ID_API_KEY?.trim() || "";
}

export async function getGeminiPlantInfo(plantName: string): Promise<PlantInfo> {
  const data = await postToBackend<{ answer?: string }>('/api/chatbot', { plantName });

  if (typeof data.answer === "string" && data.answer.length > 0) {
    return { answer: data.answer };
  }

  throw new Error("Invalid chatbot response from the backend.");
}

export async function identifyPlantWithBackend(imageBase64: string) {
  const apiKey = getPlantApiKey();

  if (!apiKey) {
    throw new Error("Plant API key is missing. Set EXPO_PUBLIC_PLANT_APIKEY in frontend/.env.local.");
  }

  const response = await fetch("https://api.plant.id/v3/identification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
    },
    body: JSON.stringify({
      images: [imageBase64],
      similar_images: true,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Plant identification request failed.");
  }

  return data as { result?: { classification?: { suggestions?: Array<{ name?: string; common_name?: string }> } } };
}