import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Flowers from "./flowers";

type Props = {
  imageUri: string | null;
  info: string | null;
  unlockedPlants?: string[];
  initialLayout?: Array<{ id: number; x: number; y: number; type: string }>;
  onLayoutChange?: (layout: Array<{ id: number; x: number; y: number; type: string }>) => void;
  loading?: boolean;
  showPlantInfoCard?: boolean;
  onBack: () => void;
  onHome?: () => void;
};

export default function FlowersUI({
  imageUri,
  info,
  unlockedPlants = [],
  initialLayout,
  onLayoutChange,
  loading,
  showPlantInfoCard = true,
  onBack,
  onHome,
}: Props) {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Flowers
        unlockedPlants={unlockedPlants}
        initialLayout={initialLayout}
        onLayoutChange={onLayoutChange}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topButtonsRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          {onHome ? (
            <TouchableOpacity onPress={onHome} style={styles.homeButton}>
              <Text style={styles.homeButtonText}>Home</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#1f7a3d" />
            <Text style={styles.loadingText}>Loading your garden...</Text>
          </View>
        ) : null}

        {!loading && unlockedPlants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Your garden is ready</Text>
            <Text style={styles.emptyText}>Capture a plant in the camera to start filling it.</Text>
          </View>
        ) : null}
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
  topButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
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
  homeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  homeButtonText: {
    color: "#1f7a3d",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingCard: {
    alignSelf: "center",
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#1b4d2e",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyCard: {
    alignSelf: "center",
    marginTop: 24,
    maxWidth: 320,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  emptyTitle: {
    color: "#1b4d2e",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 4,
    color: "#46624b",
    fontSize: 13,
    textAlign: "center",
  },
});