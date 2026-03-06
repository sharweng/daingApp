import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { OrderDetail, Screen } from "../../types";
import { getOrderById } from "../../services/api";
import { API_BASE_URL } from "../../constants/config";

interface Props {
  orderId: string;
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

// Full status flow for display purposes
const statusFlow = ["pending", "confirmed", "shipped", "delivered"];

export default function AdminOrderDetailScreen({
  orderId,
  onNavigate,
  onBack,
}: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await getOrderById(API_BASE_URL, orderId);
      setOrder(data);
    } catch (err) {
      console.error("Failed to load order:", err);
      Alert.alert("Error", "Failed to load order");
    } finally {
      setLoading(false);
    }
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
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={ecommerceStyles.headerTitle}>Order Not Found</Text>
          <View style={ecommerceStyles.backButton} />
        </View>
      </View>
    );
  }

  const statusColor = statusColors[order.status] || "#64748B";

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>
          Order #{order.orderNumber}
        </Text>
        <View style={ecommerceStyles.backButton} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Status */}
        <View
          style={{
            backgroundColor: statusColor + "20",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: statusColor,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: statusColor,
              textTransform: "capitalize",
            }}
          >
            {order.status}
          </Text>
          <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>
            Ordered on{" "}
            {new Date(order.dateOrdered || order.created_at).toLocaleDateString(
              "en-PH",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </Text>
        </View>

        {/* Status Progress */}
        <View style={{ flexDirection: "row", marginBottom: 24 }}>
          {statusFlow.map((status, idx) => {
            const currentIdx = statusFlow.indexOf(order.status);
            const isCompleted =
              order.status === "cancelled" ? false : idx <= currentIdx;
            const isActive = order.status === status;
            return (
              <View key={status} style={{ flex: 1, alignItems: "center" }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isCompleted
                      ? statusColors[status]
                      : "#334155",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isCompleted && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    color: isActive ? statusColors[status] : "#94A3B8",
                    marginTop: 4,
                    textTransform: "capitalize",
                  }}
                >
                  {status}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Customer Info */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
            marginBottom: 12,
          }}
        >
          Customer Details
        </Text>
        <View
          style={{
            backgroundColor: "#1E293B",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}>
            {order.address.fullName}
          </Text>
          <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>
            {order.address.phone}
          </Text>
          <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 8 }}>
            {order.address.address}, {order.address.city},{" "}
            {order.address.province} {order.address.postalCode}
          </Text>
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
              marginBottom: 8,
            }}
          >
            <Image
              source={{ uri: item.image || "https://via.placeholder.com/60" }}
              style={{ width: 60, height: 60, borderRadius: 8 }}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
              >
                {item.name}
              </Text>
              <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                ₱{item.price.toLocaleString()} × {item.quantity || 1}
              </Text>
            </View>
            <Text
              style={{ fontSize: 14, fontWeight: "bold", color: "#FFFFFF" }}
            >
              ₱{(item.price * (item.quantity || 1)).toLocaleString()}
            </Text>
          </View>
        ))}

        {/* Summary */}
        <View
          style={{
            backgroundColor: "#1E293B",
            borderRadius: 12,
            padding: 16,
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "#94A3B8" }}>Subtotal</Text>
            <Text style={{ color: "#FFFFFF" }}>
              ₱{(order.subtotal || order.total).toLocaleString()}
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
              ₱{(order.shippingFee || 0).toLocaleString()}
            </Text>
          </View>
          {(order.discount || 0) > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#10B981" }}>Discount</Text>
              <Text style={{ color: "#10B981" }}>
                -₱{(order.discount || 0).toLocaleString()}
              </Text>
            </View>
          )}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderTopColor: "#334155",
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
      </ScrollView>
    </View>
  );
}
