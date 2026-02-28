import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { theme } from "../../styles/theme";
import { OrderDetail, Screen } from "../../types";
import { getOrderById, cancelOrder } from "../../services/api";
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
  preparing: "#8B5CF6",
  shipped: "#06B6D4",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

const statusIcons: Record<string, string> = {
  pending: "time",
  confirmed: "checkmark-circle",
  preparing: "cube",
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
    } catch (err) {
      console.error("Failed to load order:", err);
      Alert.alert("Error", "Failed to load order details");
    } finally {
      setLoading(false);
    }
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
          <View
            key={index}
            style={{
              flexDirection: "row",
              backgroundColor: "#1E293B",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
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
      </ScrollView>
    </View>
  );
}
