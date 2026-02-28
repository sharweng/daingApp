import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { RecentOrder, Screen } from "../../types";
import { getSellerOrders } from "../../services/api";

interface Props {
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

export default function SellerOrdersScreen({ onNavigate, onBack }: Props) {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getSellerOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const filteredOrders = orders.filter(
    (o) => statusFilter === "all" || o.status === statusFilter,
  );

  const renderOrder = useCallback(
    ({ item }: { item: RecentOrder }) => (
      <TouchableOpacity
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
        onPress={() => onNavigate("sellerOrderDetail", { orderId: item.id })}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
            #{item.orderNumber}
          </Text>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor: (statusColors[item.status] || "#64748B") + "20",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: statusColors[item.status] || "#64748B",
                textTransform: "capitalize",
              }}
            >
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 14, color: "#94A3B8", marginBottom: 4 }}>
          {item.customer}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            {new Date(item.date).toLocaleDateString("en-PH")}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#3B82F6" }}>
            ₱{item.total.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  const statuses = [
    "all",
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ];

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Status Filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={statuses}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: statusFilter === item ? "#3B82F6" : "#F1F5F9",
              marginRight: 8,
            }}
            onPress={() => setStatusFilter(item)}
          >
            <Text
              style={{
                color: statusFilter === item ? "#fff" : "#64748B",
                fontWeight: "500",
                textTransform: "capitalize",
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No orders found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
