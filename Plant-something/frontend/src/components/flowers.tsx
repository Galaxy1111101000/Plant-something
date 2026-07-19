import { useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const ZOOM = 2;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  flower: {
    position: "absolute",
    width: 100,
    height: 100,
  },
  menuBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 20, 0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#4a7c59",
  },
  addButtonPressed: {
    backgroundColor: "#3a6247",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

type FlowerPlacement = {
  id: number;
  x: number;
  y: number;
};

type DraggableFlowerProps = {
  initialX: number;
  initialY: number;
  scale: SharedValue<number>;
};

function DraggableFlower({ initialX, initialY, scale }: DraggableFlowerProps) {
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
    });

  const flowerStyle = useAnimatedStyle(() => ({
    left: initialX,
    top: initialY,
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
    ],
  }));

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.Image
        source={require("../../assets/images/wild_columbine.png")}
        style={[styles.flower, flowerStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
}

export default function Flowers() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  const [flowers, setFlowers] = useState<FlowerPlacement[]>([]);

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

  const handleAddFlower = () => {
    const contentWidth = width * ZOOM;
    const contentHeight = height * ZOOM;
    const margin = 100;

    const x = margin + Math.random() * (contentWidth - margin * 2);
    const y = margin + Math.random() * (contentHeight - margin * 2);

    setFlowers((prev) => [...prev, { id: Date.now() + Math.random(), x, y }]);
  };

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
                initialX={flower.x}
                initialY={flower.y}
                scale={scale}
              />
            ))}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.menuBar}>
        <Pressable
          onPress={handleAddFlower}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addButtonText}>Add Wild Columbine</Text>
        </Pressable>
      </View>
    </View>
  );
}