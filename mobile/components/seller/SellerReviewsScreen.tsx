import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { SellerReview, Screen } from "../../types";
import { getSellerReviews, replyToReview } from "../../services/api";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export default function SellerReviewsScreen({ onNavigate, onBack }: Props) {
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await getSellerReviews();
      setReviews(data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      Alert.alert("Error", "Please enter a reply");
      return;
    }

    try {
      setSubmitting(true);
      await replyToReview(reviewId, replyText.trim());
      setReplyingTo(null);
      setReplyText("");
      await loadReviews();
      Alert.alert("Success", "Reply submitted");
    } catch (err) {
      Alert.alert("Error", "Failed to submit reply");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#F59E0B" : "#E2E8F0"}
          />
        ))}
      </View>
    );
  };

  const renderReview = useCallback(
    ({ item }: { item: SellerReview }) => (
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
        }}
      >
        {/* Product Info */}
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Image
            source={{
              uri: item.productImage || "https://via.placeholder.com/50",
            }}
            style={{ width: 50, height: 50, borderRadius: 8 }}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              {item.productName}
            </Text>
            <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
              Order #{item.orderNumber}
            </Text>
          </View>
        </View>

        {/* Review Content */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#334155",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "bold", color: "#94A3B8" }}
            >
              {item.customerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              {item.customerName}
            </Text>
            {renderStars(item.rating)}
          </View>
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>
          {item.comment}
        </Text>

        {/* Existing Reply */}
        {item.reply && (
          <View
            style={{
              backgroundColor: "#334155",
              borderRadius: 8,
              padding: 12,
              borderLeftWidth: 3,
              borderLeftColor: "#3B82F6",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#3B82F6",
                marginBottom: 4,
              }}
            >
              Your Reply
            </Text>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>{item.reply}</Text>
          </View>
        )}

        {/* Reply Input */}
        {!item.reply && (
          <>
            {replyingTo === item.id ? (
              <View>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    marginBottom: 8,
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                  placeholder="Write a reply..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={replyText}
                  onChangeText={setReplyText}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#334155",
                      borderRadius: 8,
                      padding: 12,
                      alignItems: "center",
                    }}
                    onPress={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                  >
                    <Text style={{ color: "#94A3B8", fontWeight: "600" }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#3B82F6",
                      borderRadius: 8,
                      padding: 12,
                      alignItems: "center",
                    }}
                    onPress={() => handleReply(item.id)}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        Submit
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: "#334155",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                  marginTop: 8,
                }}
                onPress={() => setReplyingTo(item.id)}
              >
                <Text style={{ color: "#3B82F6", fontWeight: "600" }}>
                  Reply to Review
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    ),
    [replyingTo, replyText, submitting],
  );

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : "0.0";

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View
        style={{
          flexDirection: "row",
          padding: 16,
          backgroundColor: "#334155",
          marginHorizontal: 16,
          marginTop: 8,
          borderRadius: 12,
        }}
      >
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#F59E0B" }}>
            {avgRating}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name="star"
                size={14}
                color={
                  s <= Math.round(parseFloat(avgRating)) ? "#F59E0B" : "#E2E8F0"
                }
              />
            ))}
          </View>
          <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
            Average
          </Text>
        </View>
        <View
          style={{ width: 1, backgroundColor: "#E2E8F0", marginHorizontal: 16 }}
        />
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#FFFFFF" }}>
            {reviews.length}
          </Text>
          <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
            Total Reviews
          </Text>
        </View>
        <View
          style={{ width: 1, backgroundColor: "#E2E8F0", marginHorizontal: 16 }}
        />
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#10B981" }}>
            {reviews.filter((r) => r.reply).length}
          </Text>
          <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
            Replied
          </Text>
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : reviews.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={64}
            color="#CBD5E1"
          />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No reviews yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReview}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
