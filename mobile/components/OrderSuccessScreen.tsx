import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../types";

interface Props {
  orderId: string;
  orderNumber?: string;
  onNavigate: (screen: Screen, params?: any) => void;
}

export default function OrderSuccessScreen({
  orderId,
  orderNumber,
  onNavigate,
}: Props) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#1E293B",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: "#D1FAE5",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Ionicons name="checkmark-circle" size={64} color="#10B981" />
      </View>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: "#FFFFFF",
          marginBottom: 8,
        }}
      >
        Order Placed!
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: "#94A3B8",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Thank you for your purchase.{"\n"}Your order has been successfully
        placed.
      </Text>
      {orderNumber && (
        <Text
          style={{
            fontSize: 14,
            color: "#3B82F6",
            fontWeight: "600",
            marginBottom: 32,
          }}
        >
          Order #{orderNumber}
        </Text>
      )}

      <TouchableOpacity
        style={{
          backgroundColor: "#3B82F6",
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 48,
          marginBottom: 12,
          width: "100%",
          alignItems: "center",
        }}
        onPress={() => onNavigate("orderDetail", { orderId })}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          View Order Details
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: "#334155",
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 48,
          marginBottom: 12,
          width: "100%",
          alignItems: "center",
        }}
        onPress={() => onNavigate("userOrders")}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
          My Orders
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 48,
          width: "100%",
          alignItems: "center",
        }}
        onPress={() => onNavigate("catalog")}
      >
        <Text style={{ color: "#3B82F6", fontSize: 16, fontWeight: "600" }}>
          Continue Shopping
        </Text>
      </TouchableOpacity>
    </View>
  );
}
