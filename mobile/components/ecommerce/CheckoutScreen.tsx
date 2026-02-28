import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../constants/config";
import { getCart, createOrder, validateVoucher } from "../../services/api";
import type { CartItem, OrderAddress, Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";

interface CheckoutScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", icon: "cash-outline" },
  { id: "gcash", label: "GCash", icon: "phone-portrait-outline" },
  { id: "maya", label: "Maya", icon: "phone-portrait-outline" },
];

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Address form
  const [address, setAddress] = useState<OrderAddress>({
    full_name: "",
    phone: "",
    address_line: "",
    city: "",
    province: "",
    postal_code: "",
    notes: "",
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("cod");

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<{
    valid: boolean;
    discount_value: number;
    discount_type: "fixed" | "percentage";
    voucher_id?: string;
  } | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  const loadCart = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const result = await getCart(API_BASE_URL);
      setItems(result.items);

      // Pre-fill name if available
      if (user?.username) {
        setAddress((prev) => ({ ...prev, full_name: user.username }));
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  };

  const calculateDiscount = () => {
    if (!voucher?.valid) return 0;
    const subtotal = calculateSubtotal();
    if (voucher.discount_type === "percentage") {
      return Math.floor(subtotal * (voucher.discount_value / 100));
    }
    return Math.min(voucher.discount_value, subtotal);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;

    setValidatingVoucher(true);
    try {
      const result = await validateVoucher(
        API_BASE_URL,
        voucherCode.trim(),
        calculateSubtotal(),
      );
      if (result.valid) {
        setVoucher(result);
        Alert.alert("Success", "Voucher applied successfully!");
      } else {
        setVoucher(null);
        Alert.alert("Invalid Voucher", "This voucher code is not valid.");
      }
    } finally {
      setValidatingVoucher(false);
    }
  };

  const validateForm = (): string | null => {
    if (!address.full_name.trim()) return "Please enter your full name";
    if (!address.phone.trim()) return "Please enter your phone number";
    if (!address.address_line.trim()) return "Please enter your address";
    if (!address.city.trim()) return "Please enter your city";
    if (!address.province.trim()) return "Please enter your province";
    if (!address.postal_code.trim()) return "Please enter your postal code";
    return null;
  };

  const handlePlaceOrder = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert("Missing Information", error);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createOrder(API_BASE_URL, address, paymentMethod);
      if (result.success && result.orders.length > 0) {
        onNavigate("orderSuccess", { orders: result.orders });
      } else {
        Alert.alert("Error", result.message || "Failed to place order");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Please login to checkout</Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={() => onNavigate("home", { defaultTab: "market" })}
          >
            <Text style={styles.primaryButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {/* Shipping Address */}
          <Text style={styles.sectionTitle}>Shipping Address</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Full Name *</Text>
            <TextInput
              style={styles.formInput}
              value={address.full_name}
              onChangeText={(text) =>
                setAddress((prev) => ({ ...prev, full_name: text }))
              }
              placeholder="Enter full name"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Phone Number *</Text>
            <TextInput
              style={styles.formInput}
              value={address.phone}
              onChangeText={(text) =>
                setAddress((prev) => ({ ...prev, phone: text }))
              }
              placeholder="Enter phone number"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Address *</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={address.address_line}
              onChangeText={(text) =>
                setAddress((prev) => ({ ...prev, address_line: text }))
              }
              placeholder="House/Unit No., Street, Barangay"
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>City *</Text>
              <TextInput
                style={styles.formInput}
                value={address.city}
                onChangeText={(text) =>
                  setAddress((prev) => ({ ...prev, city: text }))
                }
                placeholder="City"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Province *</Text>
              <TextInput
                style={styles.formInput}
                value={address.province}
                onChangeText={(text) =>
                  setAddress((prev) => ({ ...prev, province: text }))
                }
                placeholder="Province"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Postal Code *</Text>
            <TextInput
              style={styles.formInput}
              value={address.postal_code}
              onChangeText={(text) =>
                setAddress((prev) => ({ ...prev, postal_code: text }))
              }
              placeholder="Postal code"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={address.notes}
              onChangeText={(text) =>
                setAddress((prev) => ({ ...prev, notes: text }))
              }
              placeholder="Delivery instructions, landmarks, etc."
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>

          {/* Payment Method */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.listItem,
                  { borderRadius: 8, marginBottom: 8 },
                  paymentMethod === method.id && {
                    borderWidth: 2,
                    borderColor: "#3498db",
                  },
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <View style={styles.listItemIcon}>
                  <Ionicons
                    name={method.icon as any}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{method.label}</Text>
                </View>
                {paymentMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#3498db" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Voucher */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Voucher Code</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={voucherCode}
                onChangeText={setVoucherCode}
                placeholder="Enter voucher code"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  validatingVoucher && styles.disabledButton,
                ]}
                onPress={handleApplyVoucher}
                disabled={validatingVoucher}
              >
                {validatingVoucher ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
            {voucher?.valid && (
              <Text style={{ color: "#2ecc71", marginTop: 8 }}>
                Voucher applied: -
                {voucher.discount_type === "percentage"
                  ? `${voucher.discount_value}%`
                  : `₱${voucher.discount_value.toLocaleString()}`}
              </Text>
            )}
          </View>

          {/* Order Summary */}
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {items.map((item) => {
              const mainImage =
                item.product.images[item.product.main_image_index]?.url ||
                item.product.images[0]?.url;
              return (
                <View key={item.product.id} style={styles.orderItem}>
                  <Image
                    source={{ uri: mainImage }}
                    style={styles.orderItemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.orderItemQty}>x{item.qty}</Text>
                  </View>
                  <Text style={styles.orderItemPrice}>
                    ₱{(item.product.price * item.qty).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Order Summary Footer */}
      <View style={styles.cartSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
          <Text style={styles.summaryValue}>
            ₱{calculateSubtotal().toLocaleString()}
          </Text>
        </View>
        {voucher?.valid && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, { color: "#2ecc71" }]}>
              -₱{calculateDiscount().toLocaleString()}
            </Text>
          </View>
        )}
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
            submitting && styles.disabledButton,
          ]}
          onPress={handlePlaceOrder}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CheckoutScreen;
