import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { theme } from "../../styles/theme";
import { OrderDetail, Screen, ProductReview, OrderItem } from "../../types";
import {
  getOrderById,
  cancelOrder,
  markOrderDelivered,
  getMyProductReview,
  createProductReview,
  updateMyProductReview,
  deleteMyProductReview,
} from "../../services/api";
import { API_BASE_URL } from "../../constants/config";

interface Props {
  orderId: string;
  serverBaseUrl?: string;
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  shipped: "#06B6D4",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

const statusIcons: Record<string, string> = {
  pending: "time",
  confirmed: "checkmark-circle",
  shipped: "car",
  delivered: "checkmark-done-circle",
  cancelled: "close-circle",
};

export default function OrderDetailScreen({
  orderId,
  serverBaseUrl = API_BASE_URL,
  onNavigate,
  onBack,
}: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  
  // Review state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [existingReview, setExistingReview] = useState<ProductReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [itemReviews, setItemReviews] = useState<Record<string, { can_review: boolean; review: ProductReview | null }>>({});

  useEffect(() => {
    loadOrder();
  }, [orderId, serverBaseUrl]);

  const loadOrder = async () => {
    if (!orderId) {
      setLoading(false);
      console.error("loadOrder called with empty orderId");
      return;
    }
    try {
      setLoading(true);
      const data = await getOrderById(serverBaseUrl, orderId);
      setOrder(data);
      
      // If order is delivered, load review status for each item
      if (data?.status === "delivered" && data?.items) {
        const reviewPromises = data.items.map(async (item) => {
          const reviewStatus = await getMyProductReview(serverBaseUrl, item.product_id);
          return { productId: item.product_id, ...reviewStatus };
        });
        const reviewResults = await Promise.all(reviewPromises);
        const reviewsMap: Record<string, { can_review: boolean; review: ProductReview | null }> = {};
        reviewResults.forEach((result) => {
          reviewsMap[result.productId] = { can_review: result.can_review, review: result.review };
        });
        setItemReviews(reviewsMap);
      }
    } catch (err) {
      console.error("Failed to load order:", err);
      Alert.alert("Error", "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = async (item: OrderItem) => {
    setSelectedItem(item);
    setReviewLoading(true);
    
    const reviewStatus = itemReviews[item.product_id];
    if (reviewStatus?.review) {
      setExistingReview(reviewStatus.review);
      setReviewRating(reviewStatus.review.rating);
      setReviewComment(reviewStatus.review.comment);
    } else {
      setExistingReview(null);
      setReviewRating(5);
      setReviewComment("");
    }
    
    setReviewLoading(false);
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedItem) return;
    
    if (reviewComment.trim().length < 10) {
      Alert.alert("Error", "Please write at least 10 characters for your review");
      return;
    }
    
    setReviewLoading(true);
    try {
      let success = false;
      if (existingReview) {
        const result = await updateMyProductReview(serverBaseUrl, selectedItem.product_id, reviewRating, reviewComment.trim());
        success = result.success;
      } else {
        const result = await createProductReview(serverBaseUrl, selectedItem.product_id, reviewRating, reviewComment.trim());
        success = result.success;
      }
      
      if (success) {
        Alert.alert("Success", existingReview ? "Review updated successfully" : "Review submitted successfully");
        setReviewModalVisible(false);
        // Refresh review status
        const newStatus = await getMyProductReview(serverBaseUrl, selectedItem.product_id);
        setItemReviews(prev => ({
          ...prev,
          [selectedItem.product_id]: newStatus
        }));
      } else {
        Alert.alert("Error", "Failed to submit review");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to submit review");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = () => {
    if (!selectedItem) return;
    
    Alert.alert("Delete Review", "Are you sure you want to delete this review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setReviewLoading(true);
          try {
            const result = await deleteMyProductReview(serverBaseUrl, selectedItem.product_id);
            if (result.success) {
              Alert.alert("Success", "Review deleted successfully");
              setReviewModalVisible(false);
              setItemReviews(prev => ({
                ...prev,
                [selectedItem.product_id]: { can_review: true, review: null }
              }));
            } else {
              Alert.alert("Error", "Failed to delete review");
            }
          } catch (err) {
            Alert.alert("Error", "Failed to delete review");
          } finally {
            setReviewLoading(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    if (!order) return;
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            setCancelling(true);
            await cancelOrder(serverBaseUrl, order.id);
            await loadOrder();
            Alert.alert("Success", "Order cancelled successfully");
          } catch (err) {
            Alert.alert("Error", "Failed to cancel order");
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const handleMarkDelivered = () => {
    if (!order) return;
    Alert.alert(
      "Mark as Delivered",
      "Confirm that you have received this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Received",
          onPress: async () => {
            try {
              setMarkingDelivered(true);
              const result = await markOrderDelivered(serverBaseUrl, order.id);
              if (result.success) {
                await loadOrder();
                Alert.alert("Success", "Order marked as delivered");
              } else {
                Alert.alert("Error", "Failed to mark order as delivered");
              }
            } catch (err) {
              Alert.alert("Error", "Failed to mark order as delivered");
            } finally {
              setMarkingDelivered(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={[
          ecommerceStyles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={ecommerceStyles.container}>
        <View style={ecommerceStyles.header}>
          <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={ecommerceStyles.headerTitle}>Order Not Found</Text>
          <View style={{ width: theme.header.backButtonSize }} />
        </View>
      </View>
    );
  }

  const statusColor = statusColors[order.status] || "#64748B";
  const statusIcon = statusIcons[order.status] || "ellipse";

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>
          Order #{order.orderNumber}
        </Text>
        <View style={{ width: theme.header.backButtonSize }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Status Card */}
        <View
          style={{
            backgroundColor: statusColor + "20",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
            borderWidth: 1,
            borderColor: statusColor,
          }}
        >
          <Ionicons name={statusIcon as any} size={32} color={statusColor} />
          <View style={{ marginLeft: 12 }}>
            <Text
              style={{ fontSize: 18, fontWeight: "bold", color: statusColor }}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
            <Text style={{ fontSize: 14, color: "#94A3B8" }}>
              {new Date(order.dateOrdered).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* Items */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
            marginBottom: 12,
          }}
        >
          Order Items ({order.items.length})
        </Text>
        {order.items.map((item, index) => (
          <View key={index} style={{ marginBottom: 12 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onNavigate("productDetail", { productId: item.product_id })}
              style={{
                flexDirection: "row",
                backgroundColor: "#1E293B",
                borderRadius: order.status === "delivered" ? 12 : 12,
                borderBottomLeftRadius: order.status === "delivered" ? 0 : 12,
                borderBottomRightRadius: order.status === "delivered" ? 0 : 12,
                padding: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Image
                source={{ uri: item.image || "https://via.placeholder.com/80" }}
                style={{ width: 80, height: 80, borderRadius: 8 }}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
                >
                  {item.name}
                </Text>
                <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                  Qty: {item.quantity}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#3B82F6",
                    marginTop: 4,
                  }}
                >
                  ₱{item.price.toLocaleString()}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                ₱{(item.price * item.quantity).toLocaleString()}
              </Text>
            </TouchableOpacity>
            
            {/* Review Button - only for delivered orders */}
            {order.status === "delivered" && (
              <TouchableOpacity
                style={{
                  backgroundColor: itemReviews[item.product_id]?.review ? "#10B981" : "#3B82F6",
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                  padding: 10,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  openReviewModal(item);
                }}
              >
                <Ionicons
                  name={itemReviews[item.product_id]?.review ? "star" : "star-outline"}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={{ color: "#FFFFFF", marginLeft: 8, fontWeight: "600", fontSize: 13 }}>
                  {itemReviews[item.product_id]?.review ? "Edit Review" : "Write Review"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Shipping Address */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
            marginTop: 8,
            marginBottom: 12,
          }}
        >
          Shipping Address
        </Text>
        <View
          style={{
            backgroundColor: "#1E293B",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons name="location" size={20} color="#3B82F6" />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#FFFFFF",
                marginLeft: 8,
              }}
            >
              {order.address.fullName}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 4 }}>
            {order.address.phone}
          </Text>
          <Text style={{ fontSize: 14, color: "#94A3B8" }}>
            {order.address.address}, {order.address.city},{" "}
            {order.address.province} {order.address.postalCode}
          </Text>
        </View>

        {/* Payment Info */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
            marginBottom: 12,
          }}
        >
          Payment Details
        </Text>
        <View
          style={{
            backgroundColor: "#1E293B",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "#94A3B8" }}>Payment Method</Text>
            <Text style={{ fontWeight: "600", color: "#FFFFFF" }}>
              {order.paymentMethod.toUpperCase()}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "#94A3B8" }}>Subtotal</Text>
            <Text style={{ color: "#FFFFFF" }}>
              ₱{order.subtotal.toLocaleString()}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "#94A3B8" }}>Shipping</Text>
            <Text style={{ color: "#FFFFFF" }}>
              ₱{order.shippingFee.toLocaleString()}
            </Text>
          </View>
          {order.discount > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#10B981" }}>Discount</Text>
              <Text style={{ color: "#10B981" }}>
                -₱{order.discount.toLocaleString()}
              </Text>
            </View>
          )}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderTopColor: "#E2E8F0",
              paddingTop: 8,
              marginTop: 8,
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: "#FFFFFF" }}
            >
              Total
            </Text>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: "#3B82F6" }}
            >
              ₱{order.total.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Cancel Button */}
        {order.status === "pending" && (
          <TouchableOpacity
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginBottom: 24,
            }}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#EF4444" }}
              >
                Cancel Order
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Mark as Delivered Button - only for shipped orders */}
        {order.status === "shipped" && (
          <TouchableOpacity
            style={{
              backgroundColor: "#D1FAE5",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginBottom: 24,
            }}
            onPress={handleMarkDelivered}
            disabled={markingDelivered}
          >
            {markingDelivered ? (
              <ActivityIndicator color="#10B981" />
            ) : (
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#10B981" }}
              >
                Mark as Delivered
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReviewModalVisible(false)}
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
                maxHeight: "80%",
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
                  {existingReview ? "Edit Review" : "Write a Review"}
                </Text>
                <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Product Info */}
              {selectedItem && (
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: "#0F172A",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 20,
                  }}
                >
                  <Image
                    source={{ uri: selectedItem.image || "https://via.placeholder.com/60" }}
                    style={{ width: 60, height: 60, borderRadius: 8 }}
                  />
                  <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                      {selectedItem.name}
                    </Text>
                  </View>
                </View>
              )}

              {/* Rating */}
              <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 10 }}>
                Rating
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    style={{ marginHorizontal: 8 }}
                  >
                    <Ionicons
                      name={star <= reviewRating ? "star" : "star-outline"}
                      size={36}
                      color={star <= reviewRating ? "#F59E0B" : "#64748B"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Comment */}
              <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 10 }}>
                Your Review
              </Text>
              <TextInput
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Share your experience with this product..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={4}
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

              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                {existingReview && (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#FEE2E2",
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                    }}
                    onPress={handleDeleteReview}
                    disabled={reviewLoading}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#EF4444" }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{
                    flex: existingReview ? 2 : 1,
                    backgroundColor: "#3B82F6",
                    borderRadius: 12,
                    padding: 16,
                    alignItems: "center",
                  }}
                  onPress={handleSubmitReview}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                      {existingReview ? "Update Review" : "Submit Review"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
