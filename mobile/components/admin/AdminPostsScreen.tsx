import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { AdminPost, Screen } from "../../types";
import {
  getAdminPosts,
  deleteAdminPost,
  togglePostVisibility,
} from "../../services/api";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export default function AdminPostsScreen({ onNavigate, onBack }: Props) {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await getAdminPosts();
      setPosts(data);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleDelete = (post: AdminPost) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminPost(post.id);
            await loadPosts();
            Alert.alert("Success", "Post deleted");
          } catch (err) {
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleToggleVisibility = async (post: AdminPost) => {
    try {
      await togglePostVisibility(post.id, !post.isVisible);
      await loadPosts();
    } catch (err) {
      Alert.alert("Error", "Failed to update post");
    }
  };

  const renderPost = useCallback(
    ({ item }: { item: AdminPost }) => (
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
          opacity: item.isVisible ? 1 : 0.6,
        }}
      >
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#334155",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text
              style={{ fontSize: 14, fontWeight: "bold", color: "#94A3B8" }}
            >
              {(item.authorName || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              {item.authorName}
            </Text>
            <Text style={{ fontSize: 12, color: "#94A3B8" }}>
              {item.authorEmail}
            </Text>
          </View>
          {!item.isVisible && (
            <View
              style={{
                backgroundColor: "#FEE2E2",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text style={{ fontSize: 10, color: "#EF4444" }}>Hidden</Text>
            </View>
          )}
        </View>

        <Text
          style={{ fontSize: 14, color: "#94A3B8", marginBottom: 8 }}
          numberOfLines={3}
        >
          {item.content}
        </Text>

        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={{
              width: "100%",
              height: 150,
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Ionicons name="heart" size={16} color="#EF4444" />
            <Text style={{ fontSize: 12, color: "#94A3B8", marginLeft: 4 }}>
              {item.likeCount}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Ionicons name="chatbubble" size={16} color="#3B82F6" />
            <Text style={{ fontSize: 12, color: "#94A3B8", marginLeft: 4 }}>
              {item.commentCount}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: item.isVisible ? "#FEF3C7" : "#D1FAE5",
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: "center",
            }}
            onPress={() => handleToggleVisibility(item)}
          >
            <Text
              style={{
                color: item.isVisible ? "#F59E0B" : "#10B981",
                fontWeight: "600",
              }}
            >
              {item.isVisible ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#FEE2E2",
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: "center",
            }}
            onPress={() => handleDelete(item)}
          >
            <Text style={{ color: "#EF4444", fontWeight: "600" }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>Community Posts</Text>
        <View style={ecommerceStyles.backButton} />
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : posts.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="newspaper-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No posts yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
