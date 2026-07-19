import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plant Something</Text>
        <Text style={styles.subtitle}>Grow your garden, one find at a time.</Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.gardenButton]}
          onPress={() => router.push('/garden')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>🌼 Go to Garden</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.findButton]}
          onPress={() => router.push('/camera')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>📷 I found a plant!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fff8',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f7a3d',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#4a7c59',
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gardenButton: {
    backgroundColor: '#4a7c59',
  },
  findButton: {
    backgroundColor: '#1f7a3d',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});