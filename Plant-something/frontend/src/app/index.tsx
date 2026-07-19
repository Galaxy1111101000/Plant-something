import CameraComponent from '@/components/CameraComponent';
import AuthGate from '@/components/AuthGate';
import { View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <AuthGate>
        <CameraComponent />
      </AuthGate>
    </View>
  );
}