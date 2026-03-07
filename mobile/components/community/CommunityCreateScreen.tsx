import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../constants/config";
import { createCommunityPost } from "../../services/api";
import type { Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";
import { theme } from "../../styles/theme";

interface CommunityCreateScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const CATEGORIES = ["Discussion", "Tips", "Questions", "Showcase", "News"];

interface ImageFile {
  uri: string;
  name: string;
  type: string;
}

export const CommunityCreateScreen: React.FC<CommunityCreateScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { isAuthenticated } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Discussion");
  const [images, setImages] = useState<ImageFile[]>([]);
  const [creating, setCreating] = useState(false);

  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert("Maximum Images", "You can only add up to 3 images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = asset.uri.split("/").pop() || `image_${Date.now()}.jpg`;
      const imageFile: ImageFile = {
        uri: asset.uri,
        name: filename,
        type: asset.mimeType || "image/jpeg",
      };
      setImages((prev) => [...prev, imageFile]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your post.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing Description", "Please enter a description.");
      return;
    }

    setCreating(true);
    try {
      const result = await createCommunityPost(
        API_BASE_URL,
        title.trim(),
        description.trim(),
        category,
        images
      );

      if (result.success) {
        Alert.alert("Success", "Your post has been created!", [
          { text: "OK", onPress: onBack },
        ]);
      } else {
        Alert.alert("Error", "Failed to create post. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>Login Required</Text>
          <Text style={styles.emptySubtext}>
            Please login to create a community post.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={() => onNavigate("login")}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Title *
          </Text>
          <TextInput
            style={{
              backgroundColor: theme.colors.backgroundLight,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              color: theme.colors.text,
            }}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Category */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -4 }}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor:
                    category === cat
                      ? theme.colors.primary
                      : theme.colors.backgroundLight,
                  borderRadius: 20,
                  marginHorizontal: 4,
                  borderWidth: 1,
                  borderColor:
                    category === cat
                      ? theme.colors.primary
                      : theme.colors.border,
                }}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: category === cat ? "#FFFFFF" : theme.colors.text,
                    fontWeight: category === cat ? "600" : "400",
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Description */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Description *
          </Text>
          <TextInput
            style={{
              backgroundColor: theme.colors.backgroundLight,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              color: theme.colors.text,
              minHeight: 120,
              textAlignVertical: "top",
            }}
            placeholder="Share your thoughts, tips, or questions..."
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Images */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Images (optional, max 3)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {images.map((img, index) => (
              <View
                key={index}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <Image
                  source={{ uri: img.uri }}
                  style={{ width: "100%", height: "100%" }}
                />
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 24,
                    height: 24,
                    backgroundColor: "#EF4444",
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 3 && (
              <TouchableOpacity
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: theme.colors.border,
                  borderStyle: "dashed",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: theme.colors.backgroundLight,
                }}
                onPress={pickImage}
              >
                <Ionicons
                  name="add"
                  size={32}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View
        style={{
          padding: 16,
          backgroundColor: theme.colors.backgroundLight,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            opacity: creating || !title.trim() || !description.trim() ? 0.5 : 1,
          }}
          onPress={handleCreate}
          disabled={creating || !title.trim() || !description.trim()}
        >
          {creating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              Create Post
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CommunityCreateScreen;
