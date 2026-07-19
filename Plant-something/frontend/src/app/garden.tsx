import { router } from 'expo-router';
import { View } from 'react-native';

import FlowersUI from '@/components/flowersUI';

export default function GardenScreen() {
  return (
    <View style={{ flex: 1 }}>
      <FlowersUI
        imageUri={null}
        info={null}
        onBack={() => router.back()}
      />
    </View>
  );
}