import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../constants/config";
import { getOrders } from "../../services/api";
import type { OrderDetail, Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";

interface UserOrdersScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return { container: styles.statusPending, text: { color: "#856404" } };
    case "confirmed":
      return { container: styles.statusConfirmed, text: { color: "#004085" } };
    case "shipped":
      return { container: styles.statusShipped, text: { color: "#155724" } };
    case "delivered":
      return { container: styles.statusDelivered, text: { color: "#155724" } };
    case "cancelled":
      return { container: styles.statusCancelled, text: { color: "#721c24" } };
    default:
      return { container: {}, text: {} };
  }
};

export const UserOrdersScreen: React.FC<UserOrdersScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadOrders = useCallback(
    async (isRefresh = false, pageNum = 1) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await getOrders(API_BASE_URL, pageNum, 10);
        if (pageNum === 1) {
          setOrders(result.orders);
        } else {
          setOrders((prev) => [...prev, ...result.orders]);
        }
        setTotal(result.total);
        setPage(pageNum);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleLoadMore = () => {
    if (!loadingMore && orders.length < total) {
      loadOrders(false, page + 1);
    }
  };

  const renderOrder = ({ item }: { item: OrderDetail }) => {
    const statusStyle = getStatusStyle(item.status);
    const firstItem = item.items[0];

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => onNavigate("orderDetail", { orderId: item.id })}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={[styles.orderStatus, statusStyle.container]}>
            <Text style={[styles.statusText, statusStyle.text]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.orderItems}>
          {firstItem && (
            <View style={styles.orderItem}>
              <Image
                source={{ uri: firstItem.image_url }}
                style={styles.orderItemImage}
                resizeMode="cover"
              />
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={1}>
                  {firstItem.name}
                </Text>
                <Text style={styles.orderItemQty}>x{firstItem.qty}</Text>
              </View>
              <Text style={styles.orderItemPrice}>
                ₱{(firstItem.price * firstItem.qty).toLocaleString()}
              </Text>
            </View>
          )}
          {item.items.length > 1 && (
            <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
              +{item.items.length - 1} more item(s)
            </Text>
          )}
        </View>

        <View style={styles.orderTotal}>
          <Text style={styles.orderTotalLabel}>
            {item.total_items} item(s) • {item.seller_name}
          </Text>
          <Text style={styles.orderTotalValue}>
            ₱{item.total.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Please login to view your orders</Text>
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
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>
            Start shopping to place your first order
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={() => onNavigate("catalog")}
          >
            <Text style={styles.primaryButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadOrders(true, 1)}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#3498db"
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
        />
      )}
    </View>
  );
};

export default UserOrdersScreen;
