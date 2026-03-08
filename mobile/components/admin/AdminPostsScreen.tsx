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
import { API_BASE_URL } from "../../constants/config";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export default function AdminPostsScreen({ onNavigate, onBack }: Props) {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await getAdminPosts(API_BASE_URL);
      setPosts(data.posts || []);
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
            await deleteAdminPost(API_BASE_URL, post.id);
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
      await togglePostVisibility(
        API_BASE_URL,
        post.id,
        post.status !== "active",
      );
      await loadPosts();
    } catch (err) {
      Alert.alert("Error", "Failed to update post");
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (statusFilter === "all") return p.status !== "deleted";  // Exclude deleted from "all"
    if (statusFilter === "active") return p.status === "active";
    if (statusFilter === "hidden") return p.status === "disabled";
    if (statusFilter === "deleted") return p.status === "deleted";
    return true;
  });

  const renderPost = useCallback(
    ({ item }: { item: AdminPost }) => {
      const isDeleted = item.status === "deleted";
      
      return (
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
          opacity: item.status === "active" ? 1 : 0.6,
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
              {(item.author_name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              {item.author_name}
            </Text>
            <Text style={{ fontSize: 12, color: "#94A3B8" }}>
              {item.category}
            </Text>
          </View>
          {item.status === "disabled" && (
            <View
              style={{
                backgroundColor: "#FEF3C7",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text style={{ fontSize: 10, color: "#F59E0B" }}>Hidden</Text>
            </View>
          )}
          {item.status === "deleted" && (
            <View
              style={{
                backgroundColor: "#FEE2E2",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text style={{ fontSize: 10, color: "#EF4444" }}>Deleted</Text>
            </View>
          )}
        </View>

        <Text
          style={{ fontSize: 14, color: "#94A3B8", marginBottom: 8 }}
          numberOfLines={3}
        >
          {item.description}
        </Text>

        {item.images && item.images.length > 0 && (
          <Image
            source={{ uri: item.images[0] }}
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
            marginBottom: isDeleted ? 0 : 12,
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
              {item.likes}
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
              {item.comments_count}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Only show action buttons for non-deleted posts */}
        {!isDeleted && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: item.status === "active" ? "#FEF3C7" : "#D1FAE5",
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: "center",
            }}
            onPress={() => handleToggleVisibility(item)}
          >
            <Text
              style={{
                color: item.status === "active" ? "#F59E0B" : "#10B981",
                fontWeight: "600",
              }}
            >
              {item.status === "active" ? "Hide" : "Show"}
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
        )}
      </View>
    );
    },
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

      {/* Filter Tabs */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["all", "active", "hidden", "deleted"] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  statusFilter === filter
                    ? filter === "active"
                      ? "#10B981"
                      : filter === "hidden"
                        ? "#F59E0B"
                        : filter === "deleted"
                          ? "#EF4444"
                          : "#3B82F6"
                    : "#334155",
              }}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                style={{
                  color: statusFilter === filter ? "#fff" : "#94A3B8",
                  fontWeight: "500",
                  textTransform: "capitalize",
                }}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredPosts.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="newspaper-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No {statusFilter === "all" ? "posts" : statusFilter} posts
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
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
