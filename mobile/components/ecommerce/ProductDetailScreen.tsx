import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../constants/config";
import {
  getCatalogProductDetail,
  getProductReviews,
  addToCart,
  toggleWishlist,
  checkWishlist,
} from "../../services/api";
import type { SellerProduct, ProductReview, Screen } from "../../types";
import { ecommerceStyles as styles } from "../../styles/ecommerce";

const { width } = Dimensions.get("window");

interface ProductDetailScreenProps {
  productId: string;
  onNavigate: (screen: Screen, params?: any) => void;
  onBack: () => void;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  productId,
  onNavigate,
  onBack,
}) => {
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    try {
      const [productData, reviewsData] = await Promise.all([
        getCatalogProductDetail(API_BASE_URL, productId),
        getProductReviews(API_BASE_URL, productId),
      ]);
      setProduct(productData);
      setReviews(reviewsData.reviews);
      if (productData) {
        setActiveImageIndex(productData.main_image_index || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const checkWishlistStatus = useCallback(async () => {
    if (isAuthenticated) {
      const inWishlist = await checkWishlist(API_BASE_URL, productId);
      setIsWishlisted(inWishlist);
    }
  }, [isAuthenticated, productId]);

  useEffect(() => {
    loadProduct();
    checkWishlistStatus();
  }, [loadProduct, checkWishlistStatus]);

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      onNavigate("login");
      return;
    }
    const result = await toggleWishlist(API_BASE_URL, productId);
    setIsWishlisted(result.in_wishlist);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      onNavigate("login");
      return;
    }

    if (!product || product.stock_qty <= 0) {
      Alert.alert("Out of Stock", "This product is currently unavailable.");
      return;
    }

    setAddingToCart(true);
    try {
      const result = await addToCart(API_BASE_URL, productId, 1);
      if (result.success) {
        Alert.alert("Added to Cart", result.message, [
          { text: "Continue Shopping", style: "cancel" },
          { text: "View Cart", onPress: () => onNavigate("cart") },
        ]);
      } else {
        Alert.alert("Error", result.message);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      onNavigate("login");
      return;
    }

    if (!product || product.stock_qty <= 0) {
      Alert.alert("Out of Stock", "This product is currently unavailable.");
      return;
    }

    setAddingToCart(true);
    try {
      const result = await addToCart(API_BASE_URL, productId, 1);
      if (result.success) {
        onNavigate("checkout");
      } else {
        Alert.alert("Error", result.message);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const renderRatingStars = (rating: number) => {
    return (
      <View style={styles.reviewRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#f1c40f" : "#ddd"}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Product not found</Text>
        </View>
      </View>
    );
  }

  const images = product.images.length > 0 ? product.images : [{ url: "" }];
  const inStock = product.stock_qty > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleToggleWishlist}>
            <Ionicons
              name={isWishlisted ? "heart" : "heart-outline"}
              size={24}
              color={isWishlisted ? "#e74c3c" : "#FFFFFF"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate("cart")}>
            <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Product Images */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveImageIndex(index);
          }}
        >
          {images.map((img, index) => (
            <Image
              key={index}
              source={{ uri: img.url }}
              style={styles.detailImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Image indicators */}
        {images.length > 1 && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            {images.map((_, index) => (
              <View
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    index === activeImageIndex ? "#3498db" : "#ddd",
                  marginHorizontal: 4,
                }}
              />
            ))}
          </View>
        )}

        <View style={styles.detailContent}>
          {/* Name and Price */}
          <Text style={styles.detailName}>{product.name}</Text>
          <Text style={styles.detailPrice}>
            ₱{product.price.toLocaleString()}
          </Text>

          {/* Stock Status */}
          <View
            style={[
              styles.stockBadge,
              inStock ? styles.inStock : styles.outOfStock,
            ]}
          >
            <Text
              style={[
                styles.stockText,
                inStock ? styles.inStockText : styles.outOfStockText,
              ]}
            >
              {inStock ? `${product.stock_qty} in stock` : "Out of stock"}
            </Text>
          </View>

          {/* Seller */}
          <TouchableOpacity
            style={{ marginTop: 12 }}
            onPress={() =>
              onNavigate("sellerStore", { sellerId: product.seller_id })
            }
          >
            <Text style={styles.detailSeller}>
              Sold by:{" "}
              <Text style={{ color: "#3498db" }}>{product.seller_name}</Text>
            </Text>
          </TouchableOpacity>

          {/* Category */}
          {product.category_name && (
            <Text style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
              Category: {product.category_name}
            </Text>
          )}

          {/* Description */}
          {product.description && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.detailDescription}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Stats */}
          {product.sold_count !== undefined && product.sold_count > 0 && (
            <Text style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
              {product.sold_count} sold
            </Text>
          )}

          {/* Reviews */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <Text style={{ color: "#888", fontStyle: "italic" }}>
                No reviews yet
              </Text>
            ) : (
              reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewUser}>{review.user_name}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {renderRatingStars(review.rating)}
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            styles.bottomBarButton,
            !inStock && styles.disabledButton,
          ]}
          onPress={handleAddToCart}
          disabled={!inStock || addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color="#3498db" />
          ) : (
            <Text
              style={[
                styles.secondaryButtonText,
                !inStock && { color: "#fff" },
              ]}
            >
              Add to Cart
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            styles.successButton,
            styles.bottomBarButton,
            !inStock && styles.disabledButton,
          ]}
          onPress={handleBuyNow}
          disabled={!inStock || addingToCart}
        >
          <Text style={styles.primaryButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProductDetailScreen;
