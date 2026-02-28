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
import { getWishlist, toggleWishlist } from "../../services/api";
import type { SellerProduct, Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";

interface WishlistScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export const WishlistScreen: React.FC<WishlistScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const loadWishlist = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await getWishlist(API_BASE_URL);
        setProducts(result.products);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemoveFromWishlist = async (productId: string) => {
    setRemovingIds((prev) => new Set(prev).add(productId));
    try {
      await toggleWishlist(API_BASE_URL, productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const renderProduct = ({ item }: { item: SellerProduct }) => {
    const mainImage =
      item.images[item.main_image_index]?.url || item.images[0]?.url;
    const isRemoving = removingIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => onNavigate("productDetail", { productId: item.id })}
      >
        <Image
          source={{ uri: mainImage }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={() => handleRemoveFromWishlist(item.id)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color="#e74c3c" />
          ) : (
            <Ionicons name="heart" size={20} color="#e74c3c" />
          )}
        </TouchableOpacity>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productSeller} numberOfLines={1}>
            {item.seller_name}
          </Text>
          <Text style={styles.productPrice}>
            ₱{item.price.toLocaleString()}
          </Text>
          {item.stock_qty <= 0 && (
            <Text style={{ color: "#e74c3c", fontSize: 12, marginTop: 4 }}>
              Out of stock
            </Text>
          )}
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
          <Text style={styles.headerTitle}>Wishlist</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            Please login to view your wishlist
          </Text>
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
        <Text style={styles.headerTitle}>Wishlist ({products.length})</Text>
        <TouchableOpacity onPress={() => onNavigate("cart")}>
          <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtext}>
            Save items you love by tapping the heart icon
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={() => onNavigate("home", { defaultTab: "market" })}
          >
            <Text style={styles.primaryButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ gap: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadWishlist(true)}
            />
          }
        />
      )}
    </View>
  );
};

export default WishlistScreen;
