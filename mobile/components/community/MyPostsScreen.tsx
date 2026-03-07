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
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../constants/config";
import { getMyCommunityPosts, deleteCommunityPost, updateCommunityPost } from "../../services/api";
import type { MyCommunityPost, Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";
import { theme } from "../../styles/theme";

const { width } = Dimensions.get("window");

interface MyPostsScreenProps {
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

export const MyPostsScreen: React.FC<MyPostsScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState<MyCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<MyCommunityPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("Discussion");
  const [saving, setSaving] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

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
        const result = await getMyCommunityPosts(API_BASE_URL, pageNum, 12);
        let filteredPosts = result.posts;
        
        // Apply category filter client-side
        if (category !== "All") {
          filteredPosts = filteredPosts.filter(p => p.category === category);
        }
        
        if (pageNum === 1) {
          setPosts(filteredPosts);
        } else {
          setPosts((prev) => [...prev, ...filteredPosts]);
        }
        setTotal(result.total);
        setPage(pageNum);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [category],
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadPosts(false, 1);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPosts(false, 1);
    }
  }, [category]);

  const handleEdit = (post: MyCommunityPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditDescription(post.description);
    setEditCategory(post.category);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    
    if (!editTitle.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }
    if (!editDescription.trim()) {
      Alert.alert("Error", "Description is required");
      return;
    }

    setSaving(true);
    try {
      const result = await updateCommunityPost(
        API_BASE_URL,
        editingPost.id,
        editTitle.trim(),
        editDescription.trim(),
        editCategory
      );
      
      if (result.success) {
        // Update the post in local state
        setPosts(prev => prev.map(p => 
          p.id === editingPost.id 
            ? { ...p, title: editTitle.trim(), description: editDescription.trim(), category: editCategory }
            : p
        ));
        setEditModalVisible(false);
        Alert.alert("Success", "Post updated successfully");
      } else {
        Alert.alert("Error", "Failed to update post");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (post: MyCommunityPost) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingPostId(post.id);
            try {
              const result = await deleteCommunityPost(API_BASE_URL, post.id);
              if (result.success) {
                setPosts(prev => prev.filter(p => p.id !== post.id));
                Alert.alert("Success", "Post deleted successfully");
              } else {
                Alert.alert("Error", "Failed to delete post");
              }
            } finally {
              setDeletingPostId(null);
            }
          },
        },
      ]
    );
  };

  const handleLoadMore = () => {
    if (!loadingMore && posts.length < total) {
      loadPosts(false, page + 1);
    }
  };

  const renderPost = ({ item }: { item: MyCommunityPost }) => {
    const firstImage = item.images[0];
    const isDeleting = deletingPostId === item.id;

    return (
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          opacity: isDeleting ? 0.5 : 1,
        }}
      >
        <TouchableOpacity
          onPress={() => onNavigate("communityPostDetail", { postId: item.id })}
        >
          {firstImage && (
            <Image
              source={{ uri: firstImage }}
              style={{ width: "100%", height: 180 }}
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
                fontSize: 16,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginBottom: 8,
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* Description */}
            <Text
              style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            {/* Stats */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                <Ionicons name="heart" size={16} color="#EF4444" />
                <Text style={{ color: "#94A3B8", marginLeft: 4, fontSize: 13 }}>
                  {item.likes}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                <Ionicons name="chatbubble" size={16} color="#3B82F6" />
                <Text style={{ color: "#94A3B8", marginLeft: 4, fontSize: 13 }}>
                  {item.comments_count}
                </Text>
              </View>
              <Text style={{ color: "#64748B", fontSize: 12 }}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderTopColor: "#334155",
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              borderRightWidth: 1,
              borderRightColor: "#334155",
            }}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={18} color="#3B82F6" />
            <Text style={{ color: "#3B82F6", marginLeft: 8, fontWeight: "600" }}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
            }}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="trash" size={18} color="#EF4444" />
                <Text style={{ color: "#EF4444", marginLeft: 8, fontWeight: "600" }}>
                  Delete
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Posts</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>Please login to view your posts</Text>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Posts</Text>
        <TouchableOpacity onPress={() => onNavigate("communityCreate")}>
          <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={{ paddingVertical: 12, backgroundColor: "#0F172A" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: category === cat ? theme.colors.primary : "#1E293B",
              }}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={{
                  color: category === cat ? "#fff" : "#94A3B8",
                  fontSize: 14,
                  fontWeight: category === cat ? "600" : "400",
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>
            {category === "All" 
              ? "You haven't created any posts yet" 
              : `No posts in ${category} category`}
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={() => onNavigate("communityCreate")}
          >
            <Text style={styles.primaryButtonText}>Create Post</Text>
          </TouchableOpacity>
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
              tintColor={theme.colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={theme.colors.primary}
              />
            ) : null
          }
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: "#1E293B",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                maxHeight: "85%",
              }}
            >
              {/* Modal Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#FFFFFF" }}>
                  Edit Post
                </Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Title */}
                <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 8 }}>
                  Title *
                </Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Post title"
                  placeholderTextColor="#64748B"
                  style={{
                    backgroundColor: "#0F172A",
                    borderRadius: 12,
                    padding: 16,
                    color: "#FFFFFF",
                    fontSize: 14,
                    marginBottom: 16,
                  }}
                />

                {/* Category */}
                <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 8 }}>
                  Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  {CATEGORIES.filter(c => c !== "All").map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: editCategory === cat ? theme.colors.primary : "#0F172A",
                        marginRight: 8,
                      }}
                      onPress={() => setEditCategory(cat)}
                    >
                      <Text
                        style={{
                          color: editCategory === cat ? "#fff" : "#94A3B8",
                          fontSize: 14,
                        }}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Description */}
                <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 8 }}>
                  Description *
                </Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Post description"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={5}
                  style={{
                    backgroundColor: "#0F172A",
                    borderRadius: 12,
                    padding: 16,
                    color: "#FFFFFF",
                    fontSize: 14,
                    height: 120,
                    textAlignVertical: "top",
                    marginBottom: 20,
                  }}
                />

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: 12,
                    padding: 16,
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                  onPress={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default MyPostsScreen;
