import React, { useState, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ZoomableImage } from "./ZoomableImage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageItem {
  url: string;
}

interface ImageGalleryModalProps {
  visible: boolean;
  images: ImageItem[];
  initialIndex: number;
  onClose: () => void;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  // Reset to initial index when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < images.length) {
      setCurrentIndex(index);
    }
  };

  const renderImage = ({ item }: { item: ImageItem }) => (
    <View style={styles.imageContainer}>
      <ZoomableImage uri={item.url} style={styles.zoomableImage} />
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Image Gallery */}
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderImage}
          keyExtractor={(_, index) => `gallery-image-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            }, 100);
          }}
        />

        {/* Dots indicator */}
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex
                    ? styles.dotActive
                    : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 180,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomableImage: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#fff",
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
});

export default ImageGalleryModal;
