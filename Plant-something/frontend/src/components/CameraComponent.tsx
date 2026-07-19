/*
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNFS from 'react-native-fs';
import 

export function CameraComponent() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}>Flip Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    width: '100%',
    paddingHorizontal: 64,
  },
  button: {
    flex: 1,
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});
*/

// App.tsx
import React, { useState, useRef } from "react";
import { router } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { getChatbotResponse } from "./chatbot";
import ChatBotInfo from "./ChatBotInfo";
import { identifyPlantWithBackend, getBackendUrl } from "../lib/gemini";
import { getAccessToken } from "../lib/auth0";

const SPRITE_ALIASES: Record<string, string[]> = {
  Columbine: ["columbine", "aquilegia scopulorum"],
  Honeysuckle: ["honeysuckle", "coral honeysuckle", "lonicera periclymenum"],
  Milkweed: ["milkweed", "common milkweed", "asclepias syriac"],
  Ninebark: ["ninebark", "physocarpus opulifolius"],
  Oak: ["oak", "quercus"],
  Serviceberry: ["serviceberry", "amelanchier"],
  "Wild Columbine": ["wild columbine", "aquilegia scopulorum"],
};

const normalizePlant = (value: string) => value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

const getSpriteLabelForPlant = (plantName: string): string | null => {
  const normalizedName = normalizePlant(plantName);

  for (const [label, aliases] of Object.entries(SPRITE_ALIASES)) {
    const candidates = [label, ...aliases].map(normalizePlant);
    if (candidates.some((candidate) => normalizedName.includes(candidate) || candidate.includes(normalizedName))) {
      return label;
    }
  }

  return null;
};

const hasPlantBeenFoundBefore = (plantName: string, existingPlantNames: string[]) => {
  const normalizedName = normalizePlant(plantName);

  return existingPlantNames
    .map(normalizePlant)
    .some((existing) => existing.includes(normalizedName) || normalizedName.includes(existing));
};

export default function CameraComponent() {
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [newUnlockedPlant, setNewUnlockedPlant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      setLoading(true);
      setError(null);
      setInfoText(null);
      setNewUnlockedPlant(null);

      const data = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
      });

      if (data) {
        setImage(data.uri);

        const identifyPlant = async () => {
          const base64 = data.base64;

          if (!base64) {
            const message = "No base64 image data returned from the camera.";
            setError(message);
            setLoading(false);
            setShowInfo(true);
            return;
          }

          try {
            let plantName = "Asclepias syriaca"; // Default for testing
            
            try {
              const result = await identifyPlantWithBackend(base64);
              const suggestion = result?.result?.classification?.suggestions?.[0];
              const identifiedName = suggestion?.name || suggestion?.common_name;
              if (identifiedName && identifiedName !== "Unknown") {
                plantName = identifiedName;
              }
              console.log("Plant ID result:", result);
            } catch (idErr) {
              console.warn("Plant identification failed, using fallback name 'Asclepias syriaca':", idErr);
            }

            console.log("Most likely plant:", plantName);

            const chatbotReply = await getChatbotResponse(plantName);
            console.log("Chatbot output:", chatbotReply);

            setInfoText(chatbotReply?.answer ?? JSON.stringify(chatbotReply));
            setShowInfo(true);

            // Save plant data to the backend
            try {
              const accessToken = await getAccessToken();
              console.log("Access token retrieved:", accessToken ? "✅ Token exists" : "❌ No token");
              
              if (!accessToken) {
                console.error("No access token available - user may not be authenticated");
              } else {
                const backendUrl = getBackendUrl();
                console.log("Backend URL:", backendUrl);
                const spriteLabel = getSpriteLabelForPlant(plantName);
                let shouldShowNewPlantUnlock = false;
                
                // Convert base64 to data URL so it can be stored and displayed
                const imageDataUrl = `data:image/jpeg;base64,${base64}`;

                try {
                  const existingPlantsResponse = await fetch(`${backendUrl}/api/user-plants`, {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  });

                  if (existingPlantsResponse.ok && spriteLabel) {
                    const existingPlantsData = (await existingPlantsResponse.json()) as {
                      plants?: Array<{ plantName?: string }>;
                    };

                    const existingPlantNames = (existingPlantsData.plants ?? [])
                      .map((plant) => plant.plantName?.trim())
                      .filter((name): name is string => Boolean(name));

                    shouldShowNewPlantUnlock = !hasPlantBeenFoundBefore(plantName, existingPlantNames);
                  }
                } catch (existingPlantsErr) {
                  console.warn("Unable to check existing plants before save:", existingPlantsErr);
                }
                
                console.log("Sending save-plant request with:", {
                  plantName,
                  imageUrl: imageDataUrl.substring(0, 50) + "...", // Log first 50 chars
                  plantInfo: chatbotReply,
                });
                
                const response = await fetch(`${backendUrl}/api/save-plant`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    plantName,
                    imageUrl: imageDataUrl,
                    plantInfo: chatbotReply,
                  }),
                });
                
                console.log("Save-plant response status:", response.status);
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  console.error("Save-plant failed:", {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData,
                  });
                } else {
                  const result = await response.json();
                  console.log("✅ Plant saved successfully!", result);

                  if (shouldShowNewPlantUnlock && spriteLabel) {
                    setNewUnlockedPlant(spriteLabel);
                    setInfoText((current) => {
                      const unlockMessage = `\n\nNew plant unlocked: ${spriteLabel}`;
                      const baseInfo = current ?? chatbotReply?.answer ?? JSON.stringify(chatbotReply);
                      return baseInfo.includes(unlockMessage.trim()) ? baseInfo : `${baseInfo}${unlockMessage}`;
                    });
                  }
                }
              }
            } catch (saveErr) {
              console.error("Error during save-plant request:", saveErr);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to analyze the photo.";
            setError(message);
            setShowInfo(true);
          } finally {
            setLoading(false);
          }
        };

        identifyPlant();
      }
    }
  };

  const retakePicture = () => {
    setImage(null);
    setShowInfo(false);
    setInfoText(null);
    setNewUnlockedPlant(null);
    setError(null);
    setLoading(false);
  };

  const goBackToCamera = () => {
    setShowInfo(false);
    setInfoText(null);
    setNewUnlockedPlant(null);
    setError(null);
    setLoading(false);
    setImage(null);
  };

  if (!permission) {
    // Permissions still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionSubtitle}>
          We need your permission to show the camera and identify plants.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showInfo) {
    return (
      <ChatBotInfo
        imageUri={image}
        info={infoText}
        newUnlockedPlant={newUnlockedPlant}
        loading={loading}
        error={error}
        onBack={goBackToCamera}
        onShowFlowers={() => router.push('/garden')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.viewfinder}>
        {!image ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={"back" as CameraType}
          />
        ) : (
          <Image source={{ uri: image }} style={styles.previewImage} />
        )}
      </View>

      {!image && (
        <View style={styles.controlBar}>
          <TouchableOpacity style={styles.shutterButton} onPress={takePicture}>
            <View style={styles.shutterButtonInner} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fff8",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6fff8",
    paddingHorizontal: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f7a3d",
    textAlign: "center",
  },
  permissionSubtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#4a7c59",
    textAlign: "center",
    lineHeight: 21,
  },
  primaryButton: {
    marginTop: 24,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f7a3d",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  viewfinder: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    width: "100%",
    resizeMode: "cover",
  },
  controlBar: {
    height: 90,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 20, 0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  shutterButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 3,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4a7c59",
  },
});