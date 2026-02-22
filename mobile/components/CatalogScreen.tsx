import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../constants/config";
import {
  getCatalogProducts,
  getCatalogCategories,
  toggleWishlist,
  getWishlistIds,
} from "../services/api";
import type { SellerProduct, ProductCategory, Screen } from "../types";
import { ecommerceStyles as styles } from "../styles/ecommerce";

interface CatalogScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

type SortOption = "latest" | "most_sold" | "price_low" | "price_high";

export default function CatalogScreen({
  onNavigate,
  onBack,
}: CatalogScreenProps) {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadProducts = useCallback(
    async (isRefresh = false, pageNum = 1) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await getCatalogProducts(API_BASE_URL, {
          search: search || undefined,
          category_id: selectedCategory || undefined,
          sort: sortBy,
          page: pageNum,
          page_size: 20,
        });

        if (pageNum === 1) {
          setProducts(result.products);
        } else {
          setProducts((prev) => [...prev, ...result.products]);
        }
        setTotal(result.total);
        setPage(pageNum);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, selectedCategory, sortBy],
  );

  const loadCategories = useCallback(async () => {
    const cats = await getCatalogCategories(API_BASE_URL);
    setCategories(cats);
  }, []);

  const loadWishlistIds = useCallback(async () => {
    if (isAuthenticated) {
      const ids = await getWishlistIds(API_BASE_URL);
      setWishlistIds(ids);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProducts(false, 1);
    loadCategories();
    loadWishlistIds();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(false, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, sortBy]);

  const handleToggleWishlist = async (productId: string) => {
    if (!isAuthenticated) {
      onNavigate("login");
      return;
    }

    const result = await toggleWishlist(API_BASE_URL, productId);
    if (result.in_wishlist) {
      setWishlistIds((prev) => [...prev, productId]);
    } else {
      setWishlistIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && products.length < total) {
      loadProducts(false, page + 1);
    }
  };

  const renderProduct = ({ item }: { item: SellerProduct }) => {
    const isWishlisted = wishlistIds.includes(item.id);
    const mainImage =
      item.images[item.main_image_index]?.url || item.images[0]?.url;

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
          onPress={() => handleToggleWishlist(item.id)}
        >
          <Ionicons
            name={isWishlisted ? "heart" : "heart-outline"}
            size={20}
            color={isWishlisted ? "#e74c3c" : "#888"}
          />
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
          {item.sold_count !== undefined && item.sold_count > 0 && (
            <Text style={styles.productSold}>{item.sold_count} sold</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: "Latest", value: "latest" },
    { label: "Best Selling", value: "most_sold" },
    { label: "Price: Low", value: "price_low" },
    { label: "Price: High", value: "price_high" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => onNavigate("wishlist")}>
            <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate("cart")}>
            <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#888"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                !selectedCategory && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !selectedCategory && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === cat.id && styles.filterChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Sort */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterScroll}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  sortBy === option.value && styles.filterChipActive,
                ]}
                onPress={() => setSortBy(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sortBy === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Products */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or search term
          </Text>
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
              onRefresh={() => loadProducts(true, 1)}
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
}
