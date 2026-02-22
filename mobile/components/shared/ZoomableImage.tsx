import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ZoomableImageProps {
  uri: string;
  style?: object;
  minZoom?: number;
  maxZoom?: number;
}

export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  uri,
  style,
  minZoom = 1,
  maxZoom = 4,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const initialDistance = useRef(0);
  const isPinching = useRef(false);
  const lastTap = useRef(0);

  const getDistance = (touches: React.TouchList | any[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap detected - toggle zoom
      if (lastScale.current > 1.1) {
        // Zoom out
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
        lastScale.current = 1;
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
      } else {
        // Zoom in to 2.5x
        Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
        lastScale.current = 2.5;
      }
    }
    lastTap.current = now;
  }, [scale, translateX, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only capture if multi-touch (pinch) or already zoomed
        return evt.nativeEvent.touches.length >= 2 || lastScale.current > 1.1;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        // If pinching (2 fingers), always capture
        if (touches.length >= 2) return true;

        // If zoomed in, only capture vertical panning or diagonal movement
        // Allow horizontal swipes to pass through to parent FlatList
        if (lastScale.current > 1.1) {
          const absX = Math.abs(gestureState.dx);
          const absY = Math.abs(gestureState.dy);

          // Only capture if vertical movement is significant OR diagonal movement
          // This allows pure horizontal swipes to pass through
          return absY > 5 || (absX > 5 && absY > 3);
        }

        // Not zoomed, let parent handle all gestures
        return false;
      },
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          isPinching.current = true;
          initialDistance.current = getDistance(touches);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2 && isPinching.current) {
          // Pinch to zoom
          const currentDistance = getDistance(touches);
          if (initialDistance.current > 0) {
            const newScale = Math.min(
              maxZoom,
              Math.max(
                minZoom,
                lastScale.current * (currentDistance / initialDistance.current),
              ),
            );
            scale.setValue(newScale);
          }
        } else if (touches.length === 1 && lastScale.current > 1) {
          // Pan when zoomed
          const newX = lastTranslateX.current + gestureState.dx;
          const newY = lastTranslateY.current + gestureState.dy;

          // Limit pan to image bounds
          const maxPanX = (SCREEN_WIDTH * (lastScale.current - 1)) / 2;
          const maxPanY = (SCREEN_HEIGHT * 0.7 * (lastScale.current - 1)) / 2;

          translateX.setValue(Math.min(maxPanX, Math.max(-maxPanX, newX)));
          translateY.setValue(Math.min(maxPanY, Math.max(-maxPanY, newY)));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isPinching.current) {
          // Save the new scale
          scale.addListener(({ value }) => {
            lastScale.current = value;
          });
          scale.removeAllListeners();
          lastScale.current = (scale as any)._value || 1;

          // If scale is too small, reset to 1
          if (lastScale.current < 1.1) {
            Animated.parallel([
              Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
              }),
            ]).start();
            lastScale.current = 1;
            lastTranslateX.current = 0;
            lastTranslateY.current = 0;
          }

          isPinching.current = false;
          initialDistance.current = 0;
        } else if (lastScale.current > 1) {
          // Save pan position
          translateX.addListener(({ value }) => {
            lastTranslateX.current = value;
          });
          translateY.addListener(({ value }) => {
            lastTranslateY.current = value;
          });
          translateX.removeAllListeners();
          translateY.removeAllListeners();
          lastTranslateX.current = (translateX as any)._value || 0;
          lastTranslateY.current = (translateY as any)._value || 0;
        }

        // Check for tap (minimal movement)
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          handleDoubleTap();
        }
      },
    }),
  ).current;

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri }}
        style={[
          styles.image,
          {
            transform: [{ scale }, { translateX }, { translateY }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
});
