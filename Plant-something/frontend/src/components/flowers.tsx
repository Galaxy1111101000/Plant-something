import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const ZOOM = 2;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const BASE_FLOWER_SIZE = 200;
const TREE_FLOWER_SIZE = BASE_FLOWER_SIZE * 2;

const maxOffset = (scale: number) => {
  "worklet";
  const contentWidth = width * ZOOM * scale;
  const contentHeight = height * ZOOM * scale;
  return {
    x: Math.max(0, (contentWidth - width) / 2),
    y: Math.max(0, (contentHeight - height) / 2),
  };
};

// keeps value within [-limit, limit], with mild rubber-band give beyond it
const clampWithRubberBand = (value: number, limit: number) => {
  "worklet";
  if (limit <= 0) return 0;
  if (value < -limit) return -limit + (value + limit) * 0.15;
  if (value > limit) return limit + (value - limit) * 0.15;
  return value;
};

type PlantKey =
  | "columbine"
  | "honeysuckle"
  | "milkweed"
  | "ninebark"
  | "oak"
  | "serviceberry"
  | "wildColumbine";

const PLANT_ORDER: PlantKey[] = [
  "honeysuckle",
  "milkweed",
  "ninebark",
  "oak",
  "serviceberry",
  "columbine",
  "wildColumbine",
];

const PLANT_IMAGES: Record<PlantKey, any> = {
  columbine: require("../../assets/images/plants/columbine.png"),
  honeysuckle: require("../../assets/images/plants/honeysuckle.png"),
  milkweed: require("../../assets/images/plants/milkweed.png"),
  ninebark: require("../../assets/images/plants/ninebark.png"),
  oak: require("../../assets/images/plants/oak.png"),
  serviceberry: require("../../assets/images/plants/serviceberry.png"),
  wildColumbine: require("../../assets/images/wild_columbine.png"),
};

const PLANT_LABELS: Record<PlantKey, string> = {
  columbine: "Columbine",
  honeysuckle: "Honeysuckle",
  milkweed: "Milkweed",
  ninebark: "Ninebark",
  oak: "Oak",
  serviceberry: "Serviceberry",
  wildColumbine: "Wild Columbine",
};

type PlantInfo = {
  commonName: string;
  latinName: string;
  ecologicalRole: string;
  appearance: string;
};

const PLANT_INFO: Record<PlantKey, PlantInfo> = {
  milkweed: {
    commonName: "Swamp Milkweed",
    latinName: "Asclepias incarnata",
    ecologicalRole:
      "The essential host plant for Monarch caterpillars; flowers provide high-quality nectar for native bees and hummingbirds.",
    appearance:
      "Striking clusters of pink-to-mauve flowers atop deep green foliage.",
  },
  columbine: {
    commonName: "Wild Columbine",
    latinName: "Aquilegia canadensis",
    ecologicalRole:
      "One of the earliest spring nectar sources available and a favorite for returning Ruby-throated Hummingbirds.",
    appearance:
      "Nodding, bell-like red and yellow flowers with distinct backward-pointing spurs.",
  },
  ninebark: {
    commonName: "Common Ninebark",
    latinName: "Physocarpus opulifolius",
    ecologicalRole:
      "Provides nesting structure for songbirds, spring pollen for native bees, and hosts specialized leaf beetles.",
    appearance:
      "A hardy shrub with peeling bark and dense umbrella-like clusters of small white flowers.",
  },
  honeysuckle: {
    commonName: "Bush Honeysuckle",
    latinName: "Diervilla lonicera",
    ecologicalRole:
      "Excellent for stabilizing soils and ravines; sulfur-yellow flowers are heavily used by bumblebees and moths.",
    appearance:
      "A low-growing native shrub with clean leaves that can flush red in spring and bronze in fall.",
  },
  serviceberry: {
    commonName: "Downy Serviceberry",
    latinName: "Amelanchier arborea",
    ecologicalRole:
      "Early spring blooms support emerging bees, while summer berries feed many bird species.",
    appearance:
      "A small understory tree with white blossoms in spring and edible purple berries in summer.",
  },
  oak: {
    commonName: "White Oak",
    latinName: "Quercus alba",
    ecologicalRole:
      "A keystone tree that supports hundreds of caterpillar species and provides acorns for wildlife.",
    appearance:
      "A long-lived canopy tree with deeply lobed leaves that turn rich tones in autumn.",
  },
  wildColumbine: {
    commonName: "Wild Columbine",
    latinName: "Aquilegia scopulorum",
    ecologicalRole:
      "Supports pollinators with early-season nectar and contributes to biodiversity in native gardens.",
    appearance:
      "Graceful nodding blooms with red, yellow, and cream tones and delicate fern-like foliage.",
  },
};

const TREE_KEYS: PlantKey[] = ["oak", "serviceberry"];

const PLANT_SIZES: Record<PlantKey, number> = PLANT_ORDER.reduce(
  (acc, key) => {
    acc[key] = TREE_KEYS.includes(key) ? TREE_FLOWER_SIZE : BASE_FLOWER_SIZE;
    return acc;
  },
  {} as Record<PlantKey, number>,
);

const PLANT_ALIASES: Record<PlantKey, string[]> = {
  columbine: ["columbine", "aquilegia scopulorum"],
  honeysuckle: ["honeysuckle", "coral honeysuckle", "lonicera periclymenum"],
  milkweed: ["milkweed", "common milkweed", "asclepias syriac"],
  ninebark: ["ninebark", "physocarpus opulifolius"],
  oak: ["oak", "quercus"],
  serviceberry: ["serviceberry", "amelanchier"],
  wildColumbine: ["wild columbine", "aquilegia scopulorum"],
};

const normalize = (value: string) => value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

const isUnlockedPlant = (type: PlantKey, unlockedPlants: string[]) => {
  const unlocked = unlockedPlants.map(normalize);
  const candidates = [PLANT_LABELS[type], ...PLANT_ALIASES[type]].map(normalize);

  return candidates.some((candidate) => unlocked.some((name) => name.includes(candidate) || candidate.includes(name)));
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  flower: {
    position: "absolute",
  },
  carouselBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: "rgba(20, 20, 20, 0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  carouselContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 16,
  },
  plantThumbWrapper: {
    alignItems: "center",
  },
  plantThumbWrapperPressed: {
    opacity: 0.6,
  },
  plantThumbImageContainer: {
    position: "relative",
  },
  plantThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  infoButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4a7c59",
    borderWidth: 1,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  infoButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  plantLabel: {
    marginTop: 4,
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  infoOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  infoCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#f6fff8",
    borderRadius: 20,
    padding: 20,
  },
  infoCommonName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1b4d2e",
  },
  infoLatinName: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#4a7c59",
    marginBottom: 12,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f7a3d",
    marginTop: 8,
    marginBottom: 2,
  },
  infoSectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#355344",
  },
  infoBackButton: {
    marginTop: 20,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#1f7a3d",
  },
  infoBackButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  lockedHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
});

type FlowerPlacement = {
  id: number;
  x: number;
  y: number;
  type: PlantKey;
};

type DraggableFlowerProps = {
  id: number;
  initialX: number;
  initialY: number;
  scale: SharedValue<number>;
  type: PlantKey;
  onPositionCommit: (id: number, nextX: number, nextY: number) => void;
  onDelete: (id: number) => void;
};

function DraggableFlower({ id, initialX, initialY, scale, type, onPositionCommit, onDelete }: DraggableFlowerProps) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
    })
    .onUpdate((e) => {
      // divide by scale so the flower tracks the finger 1:1 on screen,
      // even when the background is zoomed in
      offsetX.value = startX.value + e.translationX / scale.value;
      offsetY.value = startY.value + e.translationY / scale.value;
    })
    .onEnd(() => {
      runOnJS(onPositionCommit)(id, initialX + offsetX.value, initialY + offsetY.value);
      offsetX.value = 0;
      offsetY.value = 0;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(280)
    .maxDistance(16)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(onDelete)(id);
      }
    });

  const flowerGesture = Gesture.Simultaneous(dragGesture, doubleTapGesture);
  const size = PLANT_SIZES[type];

  const flowerStyle = useAnimatedStyle(() => ({
    left: initialX,
    top: initialY,
    width: size,
    height: size,
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
    ],
  }));

  return (
    <GestureDetector gesture={flowerGesture}>
      <Animated.Image
        source={PLANT_IMAGES[type]}
        style={[styles.flower, flowerStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
}

type FlowersProps = {
  unlockedPlants: string[];
  initialLayout?: Array<{ id: number; x: number; y: number; type: string }>;
  onLayoutChange?: (layout: Array<{ id: number; x: number; y: number; type: string }>) => void;
};

const isPlantKey = (value: string): value is PlantKey => {
  return (PLANT_ORDER as string[]).includes(value);
};

export default function Flowers({ unlockedPlants, initialLayout = [], onLayoutChange }: FlowersProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  const [flowers, setFlowers] = useState<FlowerPlacement[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [infoPlant, setInfoPlant] = useState<PlantKey | null>(null);
  const skipNextSyncRef = useRef(true);
  const removedTypesRef = useRef<Set<PlantKey>>(new Set());
  const availablePlants = useMemo(
    () => PLANT_ORDER.filter((key) => isUnlockedPlant(key, unlockedPlants)),
    [unlockedPlants],
  );

  useEffect(() => {
    setHydrated(false);
    skipNextSyncRef.current = true;
    removedTypesRef.current.clear();
    const nextFlowers = initialLayout
      .filter((item): item is Required<Pick<FlowerPlacement, "id" | "x" | "y" | "type">> => (
        typeof item.id === "number"
        && typeof item.x === "number"
        && typeof item.y === "number"
        && typeof item.type === "string"
        && isPlantKey(item.type)
      ))
      .map((item) => ({
        id: item.id,
        x: item.x,
        y: item.y,
        type: item.type,
      }));

    setFlowers(nextFlowers);
    setHydrated(true);
  }, [initialLayout]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    setFlowers((current) => {
      const availableSet = new Set(availablePlants);
      const allowedFlowers = current.filter((flower) => availableSet.has(flower.type));
      const currentTypes = new Set(allowedFlowers.map((flower) => flower.type));
      const missingPlants = availablePlants.filter((plant) => (
        !currentTypes.has(plant)
        && !removedTypesRef.current.has(plant)
      ));

      const hasPrunedAny = allowedFlowers.length !== current.length;

      if (missingPlants.length === 0) {
        return hasPrunedAny ? allowedFlowers : current;
      }

      const seededPlacements = missingPlants.map((type, index) => {
        const placementIndex = allowedFlowers.length + index;
        const column = placementIndex % 3;
        const row = Math.floor(placementIndex / 3);

        return {
          id: Date.now() + Math.random() + index,
          type,
          x: 120 + column * 160,
          y: 140 + row * 160,
        };
      });

      return [...allowedFlowers, ...seededPlacements];
    });
  }, [availablePlants, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    // Prevent pushing a hydration snapshot back to the server.
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    onLayoutChange?.(flowers);
  }, [flowers, hydrated, onLayoutChange]);

  const springConfig = {
    damping: 30,
    stiffness: 200,
    overshootClamping: true, // no bounce past the target value
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const bounds = maxOffset(scale.value);
      translateX.value = clampWithRubberBand(
        startX.value + e.translationX,
        bounds.x,
      );
      translateY.value = clampWithRubberBand(
        startY.value + e.translationY,
        bounds.y,
      );
    })
    .onEnd((e) => {
      const bounds = maxOffset(scale.value);
      translateX.value = withDecay({
        velocity: e.velocityX,
        clamp: [-bounds.x, bounds.x],
        deceleration: 0.995,
      });
      translateY.value = withDecay({
        velocity: e.velocityY,
        clamp: [-bounds.y, bounds.y],
        deceleration: 0.995,
      });
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(
        Math.max(startScale.value * e.scale, MIN_SCALE),
        MAX_SCALE,
      );
    })
    .onEnd(() => {
      const bounds = maxOffset(scale.value);
      translateX.value = withSpring(
        Math.min(Math.max(translateX.value, -bounds.x), bounds.x),
        springConfig,
      );
      translateY.value = withSpring(
        Math.min(Math.max(translateY.value, -bounds.y), bounds.y),
        springConfig,
      );
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleAddFlower = (type: PlantKey) => {
    removedTypesRef.current.delete(type);
    const size = PLANT_SIZES[type];

    // convert the current screen-center point into content-space coordinates,
    // accounting for whatever pan/zoom is currently applied
    const centerX = width / 2 - translateX.value / scale.value - size / 2;
    const centerY = height / 2 - translateY.value / scale.value - size / 2;

    setFlowers((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), x: centerX, y: centerY, type },
    ]);
  };

  const handleFlowerPositionCommit = (flowerId: number, nextX: number, nextY: number) => {
    setFlowers((current) => current.map((flower) => (
      flower.id === flowerId
        ? { ...flower, x: nextX, y: nextY }
        : flower
    )));
  };

  const handleDeleteFlower = (flowerId: number) => {
    setFlowers((current) => {
      const toDelete = current.find((flower) => flower.id === flowerId);

      if (!toDelete) {
        return current;
      }

      const next = current.filter((flower) => flower.id !== flowerId);
      const hasSameTypeRemaining = next.some((flower) => flower.type === toDelete.type);

      if (!hasSameTypeRemaining) {
        removedTypesRef.current.add(toDelete.type);
      }

      return next;
    });
  };

  const activeInfo = infoPlant ? PLANT_INFO[infoPlant] : null;

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={styles.container}>
          <Animated.Image
            source={require("../../assets/images/background.png")}
            style={[
              {
                width: width * ZOOM,
                height: height * ZOOM,
              },
              animatedStyle,
            ]}
            resizeMode="cover"
          />
          <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
            {flowers.map((flower) => (
              <DraggableFlower
                key={flower.id}
                id={flower.id}
                initialX={flower.x}
                initialY={flower.y}
                scale={scale}
                type={flower.type}
                onPositionCommit={handleFlowerPositionCommit}
                onDelete={handleDeleteFlower}
              />
            ))}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.carouselBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
        >
          {availablePlants.length > 0 ? availablePlants.map((key) => (
            <Pressable
              key={key}
              onPress={() => handleAddFlower(key)}
              style={({ pressed }) => [
                styles.plantThumbWrapper,
                pressed && styles.plantThumbWrapperPressed,
              ]}
            >
              <View style={styles.plantThumbImageContainer}>
                <Image source={PLANT_IMAGES[key]} style={styles.plantThumb} resizeMode="contain" />
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => setInfoPlant(key)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.infoButtonText}>i</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.plantLabel}>{PLANT_LABELS[key]}</Text>
            </Pressable>
          )) : (
            <Text style={styles.lockedHint}>Unlock plants in the camera to add them here.</Text>
          )}
        </ScrollView>
      </View>

      {activeInfo ? (
        <View style={styles.infoOverlay}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCommonName}>{activeInfo.commonName}</Text>
            <Text style={styles.infoLatinName}>{activeInfo.latinName}</Text>

            <Text style={styles.infoSectionTitle}>Ecological Role</Text>
            <Text style={styles.infoSectionText}>{activeInfo.ecologicalRole}</Text>

            <Text style={styles.infoSectionTitle}>Appearance</Text>
            <Text style={styles.infoSectionText}>{activeInfo.appearance}</Text>

            <TouchableOpacity
              style={styles.infoBackButton}
              onPress={() => setInfoPlant(null)}
            >
              <Text style={styles.infoBackButtonText}>← Back to Garden</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}