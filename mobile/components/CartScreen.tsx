import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../constants/config";
import { getCart, updateCartItem, removeFromCart } from "../services/api";
import type { CartItem, Screen } from "../types";
import { ecommerceStyles as styles } from "../styles/ecommerce";

interface CartScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const loadCart = useCallback(
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
        const result = await getCart(API_BASE_URL);
        setItems(result.items);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleUpdateQuantity = async (productId: string, newQty: number) => {
    if (newQty < 1) {
      handleRemoveItem(productId);
      return;
    }

    setUpdatingItems((prev) => new Set(prev).add(productId));
    try {
      const result = await updateCartItem(API_BASE_URL, productId, newQty);
      if (result.success) {
        setItems((prev) =>
          prev.map((item) =>
            item.product.id === productId ? { ...item, qty: newQty } : item,
          ),
        );
      }
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleRemoveItem = (productId: string) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setUpdatingItems((prev) => new Set(prev).add(productId));
            try {
              const result = await removeFromCart(API_BASE_URL, productId);
              if (result.success) {
                setItems((prev) =>
                  prev.filter((item) => item.product.id !== productId),
                );
              }
            } finally {
              setUpdatingItems((prev) => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
              });
            }
          },
        },
      ],
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  };

  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const { product, qty } = item;
    const mainImage =
      product.images[product.main_image_index]?.url || product.images[0]?.url;
    const isUpdating = updatingItems.has(product.id);

    return (
      <View style={styles.cartItem}>
        <TouchableOpacity
          onPress={() => onNavigate("productDetail", { productId: product.id })}
        >
          <Image
            source={{ uri: mainImage }}
            style={styles.cartItemImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <View style={styles.cartItemInfo}>
          <TouchableOpacity
            onPress={() =>
              onNavigate("productDetail", { productId: product.id })
            }
          >
            <Text style={styles.cartItemName} numberOfLines={2}>
              {product.name}
            </Text>
          </TouchableOpacity>
          <Text style={styles.cartItemPrice}>
            ₱{product.price.toLocaleString()}
          </Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(product.id, qty - 1)}
              disabled={isUpdating}
            >
              <Ionicons name="remove" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            {isUpdating ? (
              <ActivityIndicator
                size="small"
                style={{ marginHorizontal: 16 }}
              />
            ) : (
              <Text style={styles.quantityText}>{qty}</Text>
            )}
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(product.id, qty + 1)}
              disabled={isUpdating || qty >= product.stock_qty}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(product.id)}
          disabled={isUpdating}
        >
          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Please login to view your cart</Text>
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
        <Text style={styles.headerTitle}>Cart ({totalItems})</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>
            Start shopping to add items to your cart
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={() => onNavigate("catalog")}
          >
            <Text style={styles.primaryButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.product.id}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadCart(true)}
              />
            }
          />

          {/* Cart Summary */}
          <View style={styles.cartSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Subtotal ({totalItems} items)
              </Text>
              <Text style={styles.summaryValue}>
                ₱{calculateTotal().toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>Calculated at checkout</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ₱{calculateTotal().toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.successButton,
                { marginTop: 16 },
              ]}
              onPress={() => onNavigate("checkout")}
            >
              <Text style={styles.primaryButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default CartScreen;
