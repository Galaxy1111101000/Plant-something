import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Flowers from "./flowers";

type Props = {
  imageUri: string | null;
  info: string | null;
  onBack: () => void;
};

export default function FlowersUI({ imageUri, info, onBack }: Props) {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Flowers />

      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {(imageUri || info) && (
          <View style={styles.infoCard}>
            {imageUri ? <Text style={styles.infoTitle}>Plant view</Text> : null}
            {info ? <Text style={styles.infoText}>{info}</Text> : null}
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fff8",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 24,
    pointerEvents: "box-none",
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  backButtonText: {
    color: "#1f7a3d",
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    maxWidth: 280,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(20, 20, 20, 0.76)",
  },
  infoTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoText: {
    color: "#f3f7f4",
    fontSize: 13,
    lineHeight: 18,
  },
});