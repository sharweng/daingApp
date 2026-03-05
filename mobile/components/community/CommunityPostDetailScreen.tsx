import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  FlatList,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../constants/config";
import {
  getCommunityPost,
  toggleLikePost,
  addComment,
} from "../../services/api";
import type { CommunityPost, CommunityComment, Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";
import { theme } from "../../styles/theme";

const { width } = Dimensions.get("window");

interface CommunityPostDetailScreenProps {
  postId: string;
  onNavigate?: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export const CommunityPostDetailScreen: React.FC<
  CommunityPostDetailScreenProps
> = ({ postId, onNavigate, onBack }) => {
  const { isAuthenticated, user } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingComment, setAddingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    loadPostDetails();
  }, [postId]);

  const loadPostDetails = async () => {
    setLoading(true);
    try {
      const result = await getCommunityPost(API_BASE_URL, postId);
      setPost(result.post);
      setComments(result.comments);
    } catch (error) {
      console.error("Error loading post:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      onNavigate?.("login");
      return;
    }

    if (!post) return;

    setLiking(true);
    try {
      const result = await toggleLikePost(API_BASE_URL, postId);
      setPost((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          likes: result.likes,
          liked_by: result.liked
            ? [...prev.liked_by, user!.id]
            : prev.liked_by.filter((id) => id !== user!.id),
        };
      });
    } finally {
      setLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!isAuthenticated) {
      onNavigate?.("login");
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    setAddingComment(true);
    try {
      const result = await addComment(
        API_BASE_URL,
        postId,
        newComment.trim(),
      );

      if (result.success && result.comment) {
        setComments((prev) => [...prev, result.comment!]);
        setNewComment("");

        // Update comment count
        if (post) {
          setPost((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              comments_count: prev.comments_count + 1,
            };
          });
        }
      }
    } finally {
      setAddingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch {
      return new Date(dateString).toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: theme.colors.textSecondary, textAlign: "center" }}>
            The post could not be loaded. Please try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLiked = user ? post.liked_by.includes(user.id) : false;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Image Carousel */}
        {post.images.length > 0 ? (
          <View style={{ backgroundColor: "#1E293B" }}>
            <Image
              source={{ uri: post.images[carouselIndex] }}
              style={{
                width: width,
                height: 300,
                backgroundColor: "#0F172A",
              }}
              resizeMode="contain"
            />

            {/* Dot Navigation */}
            {post.images.length > 1 && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 12,
                  gap: 6,
                }}
              >
                {post.images.map((_, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setCarouselIndex(idx)}
                    style={{
                      width: idx === carouselIndex ? 10 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        idx === carouselIndex
                          ? theme.colors.primary
                          : "#64748B",
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View
            style={{
              width: width,
              height: 200,
              backgroundColor: "#1E293B",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="image" size={48} color="#475569" />
          </View>
        )}

        {/* Post Content */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          {/* Category Badge */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                backgroundColor: theme.colors.primary,
                color: "white",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: "600",
                alignSelf: "flex-start",
              }}
            >
              {post.category.toUpperCase()}
            </Text>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: theme.colors.text,
              marginBottom: 12,
            }}
          >
            {post.title}
          </Text>

          {/* Author Info */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#1E293B",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              {post.author_avatar ? (
                <Image
                  source={{ uri: post.author_avatar }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              ) : (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontWeight: "bold",
                    fontSize: 16,
                  }}
                >
                  {post.author_name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                {post.author_name}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 12,
                }}
              >
                {formatDate(post.created_at)}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            {post.description}
          </Text>

          {/* Engagement Stats */}
          <View
            style={{
              flexDirection: "row",
              gap: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.colors.border,
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              onPress={handleLike}
              disabled={liking}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={20}
                color={isLiked ? "#ef4444" : theme.colors.textSecondary}
              />
              <Text
                style={{
                  color: isLiked ? "#ef4444" : theme.colors.textSecondary,
                  fontSize: 13,
                }}
              >
                {post.likes} {post.likes === 1 ? "like" : "likes"}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </Text>
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "600",
              fontSize: 16,
              marginBottom: 12,
            }}
          >
            Comments
          </Text>

          {comments.length === 0 ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                textAlign: "center",
                paddingVertical: 20,
                fontSize: 14,
              }}
            >
              No comments yet. Be the first to comment!
            </Text>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item: comment }) => (
                <View
                  style={{
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: "#1E293B",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontWeight: "600",
                          fontSize: 12,
                        }}
                      >
                        {comment.author_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          backgroundColor: "#1E293B",
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontWeight: "600",
                            fontSize: 12,
                            marginBottom: 4,
                          }}
                        >
                          {comment.author_name}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: 13,
                            lineHeight: 18,
                          }}
                        >
                          {comment.text}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontSize: 11,
                          marginLeft: 4,
                        }}
                      >
                        {formatDate(comment.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Comment Section */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#1E293B",
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        {isAuthenticated ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <View
              style={{
                flex: 1,
                borderRadius: 8,
                backgroundColor: theme.colors.backgroundLight,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: 12,
                paddingVertical: 8,
                minHeight: 40,
                justifyContent: "center",
              }}
            >
              <TextInput
                style={{
                  color: theme.colors.text,
                  fontSize: 14,
                  maxHeight: 100,
                }}
                placeholder="Write a comment..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                editable={!addingComment}
              />
            </View>
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={addingComment || !newComment.trim()}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: theme.colors.primary,
                borderRadius: 6,
                justifyContent: "center",
                alignItems: "center",
                opacity: addingComment || !newComment.trim() ? 0.5 : 1,
              }}
            >
              {addingComment ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => onNavigate?.("login")}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: theme.colors.primary,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Login to comment
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};
