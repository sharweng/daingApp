import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { AdminOrder, Screen } from "../../types";
import { getAdminOrders } from "../../services/api";
import { API_BASE_URL } from "../../constants/config";

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

export default function AdminOrdersScreen({ onNavigate, onBack }: Props) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getAdminOrders(API_BASE_URL);
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.seller_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderOrder = useCallback(
    ({ item }: { item: AdminOrder }) => (
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
        onPress={() => onNavigate("adminOrderDetail", { orderId: item.id })}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
            #{item.order_number}
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
        <Text style={{ fontSize: 14, color: "#FFFFFF" }}>
          {item.buyer_name}
        </Text>
        <Text style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>
          {item.seller_name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            {new Date(item.created_at).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: "#94A3B8", marginRight: 8 }}>
              {item.total_items} items
            </Text>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: "#3B82F6" }}
            >
              ₱{item.total.toLocaleString()}
            </Text>
          </View>
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
        <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>All Orders</Text>
        <View style={ecommerceStyles.backButton} />
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={ecommerceStyles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={ecommerceStyles.searchInput}
            placeholder="Search by order # or customer..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        style={{ flexGrow: 0, flexShrink: 0, maxHeight: 56 }}
      >
        {statuses.map((item) => (
          <TouchableOpacity
            key={item}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor:
                statusFilter === item
                  ? statusColors[item] || "#3B82F6"
                  : "#F1F5F9",
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
        ))}
      </ScrollView>

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
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
