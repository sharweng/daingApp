import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ecommerceStyles } from "../../styles/ecommerce";
import { SellerProduct, Screen } from "../../types";
import { getSellerProducts, deleteSellerProduct } from "../../services/api";
import { API_BASE_URL } from "../../constants/config";

interface Props {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export default function SellerProductsScreen({ onNavigate, onBack }: Props) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getSellerProducts(API_BASE_URL, {});
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (product: SellerProduct) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSellerProduct(API_BASE_URL, product.id);
              setProducts((prev) => prev.filter((p) => p.id !== product.id));
              Alert.alert("Success", "Product deleted");
            } catch (err) {
              Alert.alert("Error", "Failed to delete product");
            }
          },
        },
      ],
    );
  };

  // Ensure products is always an array before filtering
  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = safeProducts.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const isActive = p.status === "available" && !p.is_disabled;
    const matchesFilter =
      filter === "all" || (filter === "active" ? isActive : !isActive);
    return matchesSearch && matchesFilter;
  });

  const renderProduct = useCallback(
    ({ item }: { item: SellerProduct }) => {
      const imageUrl = item.images?.[item.main_image_index ?? 0]?.url || item.images?.[0]?.url;
      const isActive = item.status === "available" && !item.is_disabled;
      return (
        <TouchableOpacity
          style={{
            backgroundColor: "#1E293B",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            flexDirection: "row",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
          onPress={() => onNavigate("productDetail", { productId: item.id })}
        >
          <Image
            source={{ uri: imageUrl || "https://via.placeholder.com/80" }}
            style={{ width: 80, height: 80, borderRadius: 8 }}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#FFFFFF",
                  flex: 1,
                }}
              >
                {item.name}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: isActive ? "#D1FAE5" : "#FEE2E2",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: isActive ? "#10B981" : "#EF4444",
                    fontWeight: "600",
                  }}
                >
                  {isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
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
            <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
              Stock: {item.stock_qty || 0} | Sold: {item.sold_count || 0}
            </Text>
            <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#334155",
                  borderRadius: 8,
                  paddingVertical: 6,
                  alignItems: "center",
                }}
                onPress={() =>
                  onNavigate("sellerProductEdit", { productId: item.id })
                }
              >
                <Ionicons name="pencil" size={16} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#FEE2E2",
                  borderRadius: 8,
                  paddingVertical: 6,
                  alignItems: "center",
                }}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [products, handleDelete, onNavigate],
  );

  return (
    <View style={ecommerceStyles.container}>
      <View style={ecommerceStyles.header}>
        <TouchableOpacity style={ecommerceStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ecommerceStyles.headerTitle}>My Products</Text>
        <TouchableOpacity
          onPress={() => onNavigate("sellerProductEdit", { productId: null })}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={{ padding: 16 }}>
        <View style={ecommerceStyles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={ecommerceStyles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {(["all", "active", "inactive"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filter === f ? "#3B82F6" : "#F1F5F9",
              }}
              onPress={() => setFilter(f)}
            >
              <Text
                style={{
                  color: filter === f ? "#fff" : "#64748B",
                  fontWeight: "500",
                  textTransform: "capitalize",
                }}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="cube-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 16 }}>
            No products found
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#3B82F6",
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 16,
            }}
            onPress={() => onNavigate("sellerProductEdit", { productId: null })}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              Add First Product
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        />
      )}
    </View>
  );
}
