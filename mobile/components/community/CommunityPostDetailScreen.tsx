import React, { useState, useEffect, useRef } from "react";
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
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../constants/config";
import {
  getCommunityPost,
  toggleLikePost,
  addComment,
  deleteComment,
  editComment,
  deleteCommunityPost,
  updateCommunityPost,
} from "../../services/api";
import type { CommunityPost, CommunityComment, Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";
import { theme } from "../../styles/theme";
import { ImageGalleryModal } from "../shared/ImageGalleryModal";

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
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingComment, setAddingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [liking, setLiking] = useState(false);
  // Edit comment states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  
  // Edit/delete post states
  const [editPostModalVisible, setEditPostModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  
  // Image editing state
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<{ uri: string; type?: string; name?: string }[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);

  const CATEGORIES = ["Tips", "Showcase", "Questions", "Discussion", "News"];

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

  const handleEditComment = (comment: CommunityComment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText("");
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId || !editCommentText.trim()) return;

    setSavingEdit(true);
    try {
      const result = await editComment(
        API_BASE_URL,
        editingCommentId,
        editCommentText.trim(),
      );

      if (result.success && result.comment) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === editingCommentId ? { ...c, text: result.comment!.text } : c
          )
        );
        handleCancelEdit();
      } else {
        Alert.alert("Error", "Failed to update comment. Please try again.");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteComment = (comment: CommunityComment) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingCommentId(comment.id);
            try {
              const result = await deleteComment(API_BASE_URL, comment.id);
              if (result.success) {
                setComments((prev) => prev.filter((c) => c.id !== comment.id));
                // Update comment count
                if (post) {
                  setPost((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      comments_count: Math.max(0, prev.comments_count - 1),
                    };
                  });
                }
              } else {
                Alert.alert("Error", "Failed to delete comment. Please try again.");
              }
            } finally {
              setDeletingCommentId(null);
            }
          },
        },
      ]
    );
  };

  // Post edit/delete handlers
  const handleEditPost = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditDescription(post.description);
    setEditCategory(post.category);
    setExistingImages(post.images || []);
    setNewImages([]);
    setImagesToRemove([]);
    setEditPostModalVisible(true);
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setImagesToRemove((prev) => [...prev, imageUrl]);
    setExistingImages((prev) => prev.filter((url) => url !== imageUrl));
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePickImage = async () => {
    const totalImages = existingImages.length + newImages.length;
    if (totalImages >= 3) {
      Alert.alert("Limit Reached", "Maximum 3 images allowed per post");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setNewImages((prev) => [
        ...prev,
        {
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: `image_${Date.now()}.jpg`,
        },
      ]);
    }
  };

  const handleSavePostEdit = async () => {
    if (!post) return;
    
    if (!editTitle.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }
    if (!editDescription.trim()) {
      Alert.alert("Error", "Description is required");
      return;
    }

    setSavingPost(true);
    try {
      const result = await updateCommunityPost(
        API_BASE_URL,
        post.id,
        editTitle.trim(),
        editDescription.trim(),
        editCategory,
        newImages.length > 0 ? newImages : undefined,
        imagesToRemove.length > 0 ? imagesToRemove : undefined
      );
      
      if (result.success) {
        const updatedImages = result.post?.images || existingImages;
        setPost((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            title: editTitle.trim(),
            description: editDescription.trim(),
            category: editCategory,
            images: updatedImages,
          };
        });
        setEditPostModalVisible(false);
        Alert.alert("Success", "Post updated successfully");
      } else {
        Alert.alert("Error", "Failed to update post");
      }
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = () => {
    if (!post) return;
    
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingPost(true);
            try {
              const result = await deleteCommunityPost(API_BASE_URL, post.id);
              if (result.success) {
                Alert.alert("Success", "Post deleted successfully", [
                  { text: "OK", onPress: () => onBack() }
                ]);
              } else {
                Alert.alert("Error", "Failed to delete post");
              }
            } finally {
              setDeletingPost(false);
            }
          },
        },
      ]
    );
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            The post could not be loaded. Please try again.
          </Text>
        </View>
      </View>
    );
  }

  const isLiked = user ? post.liked_by.includes(user.id) : false;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Carousel */}
        {post.images.length > 0 ? (
          <View style={{ backgroundColor: "#1E293B" }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCarouselIndex(index);
              }}
            >
              {post.images.map((imageUrl, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => setGalleryVisible(true)}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={{
                      width: width,
                      height: 300,
                      backgroundColor: "#0F172A",
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

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

          {/* Edit/Delete buttons for post author */}
          {user && post.author_id === user.id && (
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: "#334155",
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
                onPress={handleEditPost}
                disabled={savingPost}
              >
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
                <Text style={{ color: "#3B82F6", fontWeight: "600" }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: "#FEE2E2",
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
                onPress={handleDeletePost}
                disabled={deletingPost}
              >
                {deletingPost ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={{ color: "#EF4444", fontWeight: "600" }}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

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
              renderItem={({ item: comment }) => {
                const isOwnComment = user?.id === comment.author_id;
                const isEditing = editingCommentId === comment.id;
                const isDeleting = deletingCommentId === comment.id;

                return (
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
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              style={{
                                color: theme.colors.text,
                                fontWeight: "600",
                                fontSize: 12,
                              }}
                            >
                              {comment.author_name}
                            </Text>
                            {isOwnComment && !isEditing && (
                              <View style={{ flexDirection: "row", gap: 8 }}>
                                <TouchableOpacity
                                  onPress={() => handleEditComment(comment)}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons
                                    name="pencil-outline"
                                    size={14}
                                    color={theme.colors.textSecondary}
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleDeleteComment(comment)}
                                  disabled={isDeleting}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  {isDeleting ? (
                                    <ActivityIndicator size="small" color="#ef4444" />
                                  ) : (
                                    <Ionicons
                                      name="trash-outline"
                                      size={14}
                                      color="#ef4444"
                                    />
                                  )}
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                          {isEditing ? (
                            <View>
                              <TextInput
                                style={{
                                  color: theme.colors.text,
                                  fontSize: 13,
                                  lineHeight: 18,
                                  backgroundColor: theme.colors.backgroundLight,
                                  borderRadius: 6,
                                  padding: 8,
                                  borderWidth: 1,
                                  borderColor: theme.colors.border,
                                  minHeight: 60,
                                }}
                                value={editCommentText}
                                onChangeText={setEditCommentText}
                                multiline
                                autoFocus
                                editable={!savingEdit}
                              />
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "flex-end",
                                  gap: 8,
                                  marginTop: 8,
                                }}
                              >
                                <TouchableOpacity
                                  onPress={handleCancelEdit}
                                  disabled={savingEdit}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    backgroundColor: "#475569",
                                    borderRadius: 4,
                                  }}
                                >
                                  <Text style={{ color: "white", fontSize: 12 }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={handleSaveEdit}
                                  disabled={savingEdit || !editCommentText.trim()}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    backgroundColor: theme.colors.primary,
                                    borderRadius: 4,
                                    opacity: savingEdit || !editCommentText.trim() ? 0.5 : 1,
                                  }}
                                >
                                  {savingEdit ? (
                                    <ActivityIndicator size="small" color="white" />
                                  ) : (
                                    <Text style={{ color: "white", fontSize: 12 }}>Save</Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <Text
                              style={{
                                color: theme.colors.text,
                                fontSize: 13,
                                lineHeight: 18,
                              }}
                            >
                              {comment.text}
                            </Text>
                          )}
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
                );
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Comment Section */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(12, insets.bottom),
          backgroundColor: "#1E293B",
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        {isAuthenticated ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View
              style={{
                flex: 1,
                borderRadius: 8,
                backgroundColor: theme.colors.backgroundLight,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: 12,
                height: 44,
                justifyContent: "center",
              }}
            >
              <TextInput
                style={{
                  color: theme.colors.text,
                  fontSize: 14,
                  flex: 1,
                }}
                placeholder="Write a comment..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                editable={!addingComment}
              />
            </View>
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={addingComment || !newComment.trim()}
              style={{
                width: 44,
                height: 44,
                backgroundColor: theme.colors.primary,
                borderRadius: 8,
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

      {/* Image Gallery Modal */}
      {post && post.images.length > 0 && (
        <ImageGalleryModal
          visible={galleryVisible}
          images={post.images.map((url) => ({ url }))}
          initialIndex={carouselIndex}
          onClose={() => setGalleryVisible(false)}
        />
      )}

      {/* Edit Post Modal */}
      <Modal
        visible={editPostModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditPostModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: "90%",
              }}
            >
              {/* Modal Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <TouchableOpacity onPress={() => setEditPostModalVisible(false)}>
                  <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ color: theme.colors.text, fontWeight: "bold", fontSize: 16 }}>
                  Edit Post
                </Text>
                <TouchableOpacity onPress={handleSavePostEdit} disabled={savingPost}>
                  {savingPost ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }}>
                {/* Title Input */}
                <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: "600" }}>
                  Title
                </Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Post title..."
                  placeholderTextColor={theme.colors.textSecondary}
                  style={{
                    backgroundColor: "#1E293B",
                    borderRadius: 8,
                    padding: 12,
                    color: theme.colors.text,
                    marginBottom: 16,
                  }}
                />

                {/* Category Select */}
                <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: "600" }}>
                  Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setEditCategory(cat)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        marginRight: 8,
                        backgroundColor: editCategory === cat ? theme.colors.primary : "#1E293B",
                      }}
                    >
                      <Text
                        style={{
                          color: editCategory === cat ? "white" : theme.colors.textSecondary,
                          fontWeight: "600",
                        }}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Description Input */}
                <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: "600" }}>
                  Description
                </Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Write your post..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  style={{
                    backgroundColor: "#1E293B",
                    borderRadius: 8,
                    padding: 12,
                    color: theme.colors.text,
                    minHeight: 150,
                    marginBottom: 16,
                  }}
                />

                {/* Images Section */}
                <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: "600" }}>
                  Images ({existingImages.length + newImages.length}/3)
                </Text>
                
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 32 }}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {/* Existing Images */}
                  {existingImages.map((imageUrl, index) => (
                    <View key={`existing-${index}`} style={{ position: "relative" }}>
                      <Image
                        source={{ uri: imageUrl }}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 8,
                          backgroundColor: "#0F172A",
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => handleRemoveExistingImage(imageUrl)}
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          backgroundColor: "#EF4444",
                          borderRadius: 12,
                          width: 24,
                          height: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  {/* New Images */}
                  {newImages.map((img, index) => (
                    <View key={`new-${index}`} style={{ position: "relative" }}>
                      <Image
                        source={{ uri: img.uri }}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 8,
                          backgroundColor: "#0F172A",
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => handleRemoveNewImage(index)}
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          backgroundColor: "#EF4444",
                          borderRadius: 12,
                          width: 24,
                          height: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  {/* Add Image Button */}
                  {existingImages.length + newImages.length < 3 && (
                    <TouchableOpacity
                      onPress={handlePickImage}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 8,
                        backgroundColor: "#0F172A",
                        borderWidth: 2,
                        borderStyle: "dashed",
                        borderColor: "#334155",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="add" size={32} color="#64748B" />
                      <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                        Add
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};
