import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../constants/config";
import { getCommunityPosts, toggleLikePost } from "../services/api";
import type { CommunityPost, Screen } from "../types";
import { ecommerceStyles as styles } from "../styles/ecommerce";

const { width } = Dimensions.get("window");
const POST_IMAGE_SIZE = (width - 48) / 2;

interface CommunityScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const CATEGORIES = [
  "All",
  "Tips",
  "Showcase",
  "Questions",
  "Discussion",
  "News",
];

export const CommunityScreen: React.FC<CommunityScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(
    async (isRefresh = false, pageNum = 1) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await getCommunityPosts(
          API_BASE_URL,
          pageNum,
          12,
          category,
          search,
        );
        if (pageNum === 1) {
          setPosts(result.posts);
        } else {
          setPosts((prev) => [...prev, ...result.posts]);
        }
        setTotal(result.total);
        setPage(pageNum);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, category],
  );

  useEffect(() => {
    loadPosts(false, 1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPosts(false, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, category]);

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      onNavigate("login");
      return;
    }

    setLikingPosts((prev) => new Set(prev).add(postId));
    try {
      const result = await toggleLikePost(API_BASE_URL, postId);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: result.likes,
                liked_by: result.liked
                  ? [...post.liked_by, user!.id]
                  : post.liked_by.filter((id) => id !== user!.id),
              }
            : post,
        ),
      );
    } finally {
      setLikingPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && posts.length < total) {
      loadPosts(false, page + 1);
    }
  };

  const renderPost = ({ item }: { item: CommunityPost }) => {
    const isLiked = user ? item.liked_by.includes(user.id) : false;
    const isLiking = likingPosts.has(item.id);
    const firstImage = item.images[0];

    return (
      <TouchableOpacity
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
        }}
        onPress={() => onNavigate("communityPostDetail", { postId: item.id })}
      >
        {firstImage && (
          <Image
            source={{ uri: firstImage }}
            style={{ width: "100%", height: 200 }}
            resizeMode="cover"
          />
        )}
        <View style={{ padding: 16 }}>
          {/* Category Badge */}
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: "#3498db20",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "#3498db", fontSize: 12 }}>
              {item.category}
            </Text>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            {item.title}
          </Text>

          {/* Description */}
          <Text
            style={{ fontSize: 14, color: "#666", marginBottom: 12 }}
            numberOfLines={3}
          >
            {item.description}
          </Text>

          {/* Author */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            {item.author_avatar ? (
              <Image
                source={{ uri: item.author_avatar }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  marginRight: 8,
                }}
              />
            ) : (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#334155",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 8,
                }}
              >
                <Ionicons name="person" size={16} color="#888" />
              </View>
            )}
            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                {item.author_name}
              </Text>
              <Text style={{ fontSize: 12, color: "#888" }}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderTopColor: "#f0f0f0",
              paddingTop: 12,
            }}
          >
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: 24,
              }}
              onPress={() => handleLike(item.id)}
              disabled={isLiking}
            >
              {isLiking ? (
                <ActivityIndicator size="small" color="#e74c3c" />
              ) : (
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={20}
                  color={isLiked ? "#e74c3c" : "#888"}
                />
              )}
              <Text
                style={{ marginLeft: 4, color: isLiked ? "#e74c3c" : "#888" }}
              >
                {item.likes}
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="chatbubble-outline" size={20} color="#888" />
              <Text style={{ marginLeft: 4, color: "#888" }}>
                {item.comments_count}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity onPress={() => onNavigate("communityCreate")}>
          <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#888"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  category === cat && styles.filterChipActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    category === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Posts */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No posts found</Text>
          <Text style={styles.emptySubtext}>
            Be the first to share something!
          </Text>
          {isAuthenticated && (
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 16 }]}
              onPress={() => onNavigate("communityCreate")}
            >
              <Text style={styles.primaryButtonText}>Create Post</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPosts(true, 1)}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#3498db"
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
        />
      )}
    </View>
  );
};

export default CommunityScreen;
