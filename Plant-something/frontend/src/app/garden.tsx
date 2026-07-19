import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import FlowersUI from '@/components/flowersUI';
import { getAccessToken } from '@/lib/auth0';
import { getBackendUrl } from '@/lib/gemini';

export default function GardenScreen() {
  const [unlockedPlants, setUnlockedPlants] = useState<string[]>([]);
  const [gardenLayout, setGardenLayout] = useState<Array<{ id: number; x: number; y: number; type: string }>>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    router.replace('/home');
  };

  useEffect(() => {
    const loadGarden = async () => {
      try {
        const accessToken = await getAccessToken();
        setAccessToken(accessToken);

        if (!accessToken) {
          setUnlockedPlants([]);
          setGardenLayout([]);
          return;
        }

        const [plantsResponse, layoutResponse] = await Promise.all([
          fetch(`${getBackendUrl()}/api/user-plants`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
          fetch(`${getBackendUrl()}/api/garden-layout`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
        ]);

        if (plantsResponse.ok) {
          const data = (await plantsResponse.json()) as { plants?: Array<{ plantName?: string }> };
          const plants = (data.plants ?? [])
            .map((plant) => plant.plantName?.trim())
            .filter((plant): plant is string => Boolean(plant));
          setUnlockedPlants(plants);
        } else {
          setUnlockedPlants([]);
        }

        if (layoutResponse.ok) {
          const data = (await layoutResponse.json()) as {
            layout?: Array<{ id?: number; x?: number; y?: number; type?: string }>;
          };

          const layout = (data.layout ?? [])
            .filter((item): item is { id: number; x: number; y: number; type: string } => (
              typeof item.id === 'number'
              && typeof item.x === 'number'
              && typeof item.y === 'number'
              && typeof item.type === 'string'
            ));

          setGardenLayout(layout);
        } else {
          setGardenLayout([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadGarden();
  }, []);

  const handleLayoutChange = useCallback(async (layout: Array<{ id: number; x: number; y: number; type: string }>) => {
    if (!accessToken || loading) {
      return;
    }

    try {
      await fetch(`${getBackendUrl()}/api/garden-layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ layout }),
      });
    } catch (error) {
      console.error('Failed to save garden layout:', error);
    }
  }, [accessToken]);

  return (
    <View style={{ flex: 1 }}>
      <FlowersUI
        imageUri={null}
        info={null}
        unlockedPlants={unlockedPlants}
        initialLayout={gardenLayout}
        onLayoutChange={handleLayoutChange}
        loading={loading}
        onBack={handleBack}
        onHome={() => router.replace('/home')}
      />
    </View>
  );
}