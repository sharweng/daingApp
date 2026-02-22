import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../constants/config";
import {
  getSellerKPIs,
  getSellerRecentOrders,
  getSellerTopProducts,
  getSellerRecentReviews,
} from "../../services/api";
import type {
  SellerKPIs,
  RecentOrder,
  TopProduct,
  SellerReview,
  Screen,
} from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";

const { width } = Dimensions.get("window");

interface SellerDashboardScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const renderRatingStars = (rating: number) => (
  <View style={{ flexDirection: "row" }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= rating ? "star" : "star-outline"}
        size={12}
        color={star <= rating ? "#f1c40f" : "#ddd"}
      />
    ))}
  </View>
);

export const SellerDashboardScreen: React.FC<SellerDashboardScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<SellerKPIs | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentReviews, setRecentReviews] = useState<SellerReview[]>([]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated || user?.role !== "seller") {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [kpisData, ordersData, productsData, reviewsData] =
          await Promise.all([
            getSellerKPIs(API_BASE_URL),
            getSellerRecentOrders(API_BASE_URL, 5),
            getSellerTopProducts(API_BASE_URL, 1, 5),
            getSellerRecentReviews(API_BASE_URL, 5),
          ]);

        setKpis(kpisData);
        setRecentOrders(ordersData);
        setTopProducts(productsData.products);
        setRecentReviews(reviewsData);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated, user],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isAuthenticated || user?.role !== "seller") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {!isAuthenticated
              ? "Please login to access seller dashboard"
              : "This feature is for sellers only"}
          </Text>
        </View>
      </View>
    );
  }

  const formatChange = (value: number) => {
    if (value === 0) return null;
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(1)}%`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
            />
          }
        >
          <View style={styles.contentContainer}>
            {/* KPIs */}
            {kpis && (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{kpis.total_products}</Text>
                  <Text style={styles.statLabel}>Products</Text>
                  {kpis.products_change !== 0 && (
                    <Text
                      style={[
                        styles.statChange,
                        kpis.products_change > 0
                          ? styles.statChangePositive
                          : styles.statChangeNegative,
                      ]}
                    >
                      {formatChange(kpis.products_change)}
                    </Text>
                  )}
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{kpis.total_orders}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                  {kpis.orders_change !== 0 && (
                    <Text
                      style={[
                        styles.statChange,
                        kpis.orders_change > 0
                          ? styles.statChangePositive
                          : styles.statChangeNegative,
                      ]}
                    >
                      {formatChange(kpis.orders_change)}
                    </Text>
                  )}
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    ₱{kpis.total_earnings.toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>Earnings</Text>
                  {kpis.earnings_change !== 0 && (
                    <Text
                      style={[
                        styles.statChange,
                        kpis.earnings_change > 0
                          ? styles.statChangePositive
                          : styles.statChangeNegative,
                      ]}
                    >
                      {formatChange(kpis.earnings_change)}
                    </Text>
                  )}
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {kpis.average_rating.toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>Rating</Text>
                  {renderRatingStars(Math.round(kpis.average_rating))}
                </View>
              </View>
            )}

            {/* Quick Actions */}
            <View style={{ marginBottom: 24 }}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 1 }]}
                  onPress={() =>
                    onNavigate("sellerProductEdit", { productId: null })
                  }
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                    Add Product
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { flex: 1 }]}
                  onPress={() => onNavigate("sellerProducts")}
                >
                  <Text style={styles.secondaryButtonText}>
                    View All Products
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Orders */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={styles.sectionTitle}>Recent Orders</Text>
                <TouchableOpacity onPress={() => onNavigate("sellerOrders")}>
                  <Text style={{ color: "#3498db" }}>View All</Text>
                </TouchableOpacity>
              </View>
              {recentOrders.length === 0 ? (
                <Text style={{ color: "#888", fontStyle: "italic" }}>
                  No orders yet
                </Text>
              ) : (
                recentOrders.map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    style={[
                      styles.listItem,
                      { borderRadius: 8, marginBottom: 8 },
                    ]}
                    onPress={() =>
                      onNavigate("sellerOrderDetail", { orderId: order.id })
                    }
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>
                        #{order.order_number}
                      </Text>
                      <Text style={styles.listItemSubtitle}>
                        {order.customer}
                      </Text>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text style={{ fontWeight: "bold", color: "#2ecc71" }}>
                        ₱{order.total.toLocaleString()}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color:
                            order.status === "pending" ? "#f39c12" : "#2ecc71",
                          textTransform: "capitalize",
                        }}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Top Products */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={styles.sectionTitle}>Top Products</Text>
                <TouchableOpacity onPress={() => onNavigate("sellerProducts")}>
                  <Text style={{ color: "#3498db" }}>View All</Text>
                </TouchableOpacity>
              </View>
              {topProducts.length === 0 ? (
                <Text style={{ color: "#888", fontStyle: "italic" }}>
                  No products yet
                </Text>
              ) : (
                topProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.listItem,
                      { borderRadius: 8, marginBottom: 8 },
                    ]}
                    onPress={() =>
                      onNavigate("sellerProductEdit", { productId: product.id })
                    }
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{product.name}</Text>
                      <Text style={styles.listItemSubtitle}>
                        {product.sold} sold • {product.stock} in stock
                      </Text>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text style={{ fontWeight: "bold", color: "#FFFFFF" }}>
                        ₱{product.price.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Recent Reviews */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={styles.sectionTitle}>Recent Reviews</Text>
                <TouchableOpacity onPress={() => onNavigate("sellerReviews")}>
                  <Text style={{ color: "#3498db" }}>View All</Text>
                </TouchableOpacity>
              </View>
              {recentReviews.length === 0 ? (
                <Text style={{ color: "#888", fontStyle: "italic" }}>
                  No reviews yet
                </Text>
              ) : (
                recentReviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewUser}>{review.user_name}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {renderRatingStars(review.rating)}
                    <Text style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      {review.product_name}
                    </Text>
                    <Text style={styles.reviewComment} numberOfLines={2}>
                      {review.comment}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default SellerDashboardScreen;
