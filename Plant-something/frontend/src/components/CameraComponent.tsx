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
import FlowersUI from "./flowersUI";
import { identifyPlantWithBackend, getBackendUrl } from "../lib/gemini";
import { getAccessToken } from "../lib/auth0";

export default function CameraComponent() {
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showFlowers, setShowFlowers] = useState(false);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      setLoading(true);
      setError(null);
      setInfoText(null);

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
            let plantName = "tree"; // Default for testing
            
            try {
              const result = await identifyPlantWithBackend(base64);
              const suggestion = result?.result?.classification?.suggestions?.[0];
              const identifiedName = suggestion?.name || suggestion?.common_name;
              if (identifiedName && identifiedName !== "Unknown") {
                plantName = identifiedName;
              }
              console.log("Plant ID result:", result);
            } catch (idErr) {
              console.warn("Plant identification failed, using fallback name 'tree':", idErr);
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
                
                // Convert base64 to data URL so it can be stored and displayed
                const imageDataUrl = `data:image/jpeg;base64,${base64}`;
                
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
    setShowFlowers(false);
    setInfoText(null);
    setError(null);
    setLoading(false);
  };

  const goBackToCamera = () => {
    setShowInfo(false);
    setShowFlowers(false);
    setInfoText(null);
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
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.takePictureButton} onPress={requestPermission}>
          <Text style={styles.takePictureButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showInfo) {
    if (showFlowers) {
      return (
        <FlowersUI
          imageUri={image}
          info={infoText}
          onBack={() => setShowFlowers(false)}
        />
      );
    }

    return (
      <ChatBotInfo
        imageUri={image}
        info={infoText}
        loading={loading}
        error={error}
        onBack={goBackToCamera}
        onShowFlowers={() => setShowFlowers(true)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        {!image ? (
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.fixedRatio}
              facing={"back" as CameraType}
            />
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <TouchableOpacity style={styles.retakeButton} onPress={retakePicture}>
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {!image && (
        <TouchableOpacity style={styles.takePictureButton} onPress={takePicture}>
          <Text style={styles.takePictureButtonText}>Take Picture</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    textAlign: "center",
    padding: 20,
  },
  box: {
    flex: 0.7,
    width: "72%",
    maxWidth: 320,
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "black",
    marginTop: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 10,
  },
  cameraContainer: {
    flex: 1,
    aspectRatio: 1,
  },
  fixedRatio: {
    flex: 1,
    aspectRatio: 1,
  },
  takePictureButton: {
    backgroundColor: "blue",
    padding: 20,
    borderRadius: 10,
    alignSelf: "center",
    position: "absolute",
    bottom: 30,
  },
  takePictureButtonText: {
    color: "white",
    fontSize: 18,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    flex: 1,
    width: "100%",
    resizeMode: "cover",
  },
  retakeButton: {
    position: "absolute",
    bottom: 30,
    backgroundColor: "red",
    padding: 20,
    borderRadius: 10,
  },
  retakeButtonText: {
    color: "white",
    fontSize: 18,
  },
});