import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  imageUri: string | null;
  info: string | null;
  newUnlockedPlant: string | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onShowFlowers: () => void;
};

export default function ChatBotInfo({
  imageUri,
  info,
  newUnlockedPlant,
  loading,
  error,
  onBack,
  onShowFlowers,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>↺ Retake</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Plant Info</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}

        <View style={styles.card}>
          {newUnlockedPlant ? (
            <View style={styles.unlockBanner}>
              <Text style={styles.unlockBannerTitle}>New Plant Unlocked</Text>
              <Text style={styles.unlockBannerText}>{newUnlockedPlant}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Analysis</Text>

          {loading ? (
            <Text style={styles.bodyText}>Analyzing your photo...</Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.bodyText}>{info ?? "No plant information found yet."}</Text>
          )}

          <TouchableOpacity onPress={onShowFlowers} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Open Flowers UI</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fff8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e3f2e8",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#e8f5eb",
  },
  backButtonText: {
    color: "#1f7a3d",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#1b4d2e",
  },
  content: {
    padding: 16,
  },
  image: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    marginBottom: 16,
    resizeMode: "cover",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  unlockBanner: {
    backgroundColor: "#e8f5eb",
    borderWidth: 1,
    borderColor: "#b7e4c7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  unlockBannerTitle: {
    color: "#1f7a3d",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  unlockBannerText: {
    marginTop: 2,
    color: "#1b4d2e",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1b4d2e",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#355344",
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#b42318",
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
    backgroundColor: "#1f7a3d",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
