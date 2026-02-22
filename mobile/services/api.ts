import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import type {
  HistoryEntry,
  AnalyticsSummary,
  AnalysisScanResult,
  AuthResponse,
  User,
  ProductCategory,
  SellerProduct,
  ProductReview,
  CartItem,
  OrderAddress,
  OrderDetail,
  CommunityPost,
  MyCommunityPost,
  CommunityComment,
  SellerProfile,
  SellerKPIs,
  SellerReview,
  RecentOrder,
  TopProduct,
  SalesCategory,
  AdminUser,
  AdminUserDetail,
  AdminUsersStats,
  AdminPost,
  AdminOrder,
  AdminOrderDetail,
  AdminScanEntry,
  AdminAuditLogEntry,
  Voucher,
} from "../types";

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, "");

// Auth token storage (will be set by AuthContext)
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

// Helper to get auth headers
const getAuthHeaders = () => {
  if (authToken) {
    return { Authorization: `Bearer ${authToken}` };
  }
  return {};
};

// Retry helper for network requests
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Only retry on network errors, not on server errors
      if (
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED" ||
        error.message?.includes("Network Error") ||
        error.message?.includes("timeout")
      ) {
        if (i < retries - 1) {
          console.log(`Retry ${i + 1}/${retries} after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
};

export const analyzeFish = async (
  imageUri: string,
  serverUrl: string,
  autoSaveDataset: boolean = false,
  confidenceThreshold: number = 0.7,
  hideColorOverlay: boolean = true,
): Promise<AnalysisScanResult> => {
  const formData = new FormData();
  // @ts-ignore: React Native FormData requires these specific fields
  formData.append("file", {
    uri: imageUri,
    name: "fish.jpg",
    type: "image/jpeg",
  });

  // Build query params
  const params = new URLSearchParams();
  if (autoSaveDataset) params.append("auto_save_dataset", "true");
  params.append("confidence_threshold", confidenceThreshold.toString());
  params.append("hide_color_overlay", hideColorOverlay ? "true" : "false");
  const urlWithParams = `${serverUrl}?${params.toString()}`;

  try {
    const response = await withRetry(
      () =>
        axios.post<AnalysisScanResult>(urlWithParams, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...getAuthHeaders(),
          },
          timeout: 30000,
        }),
      3,
      1000,
    );

    return response.data;
  } catch (error: any) {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new Error(
        "Request timed out. Please check your server IP address and try again.",
      );
    } else if (
      error.code === "ERR_NETWORK" ||
      error.message?.includes("Network Error")
    ) {
      throw new Error(
        "Cannot connect to server. Please verify the IP address is correct.",
      );
    } else {
      throw new Error(error.message || "Failed to analyze image");
    }
  }
};

export const fetchHistory = async (
  historyUrl: string,
): Promise<HistoryEntry[]> => {
  try {
    const response = await axios.get(normalizeUrl(historyUrl), {
      headers: getAuthHeaders(),
      timeout: 10000, // 10 seconds timeout
    });
    const entries = response.data?.entries;
    if (Array.isArray(entries)) {
      return entries as HistoryEntry[];
    }
    return [];
  } catch (error: any) {
    // Silently return empty array - don't trigger Expo error overlay
    return [];
  }
};

export const deleteHistoryEntry = async (
  historyUrl: string,
  entryId: string,
): Promise<void> => {
  const base = normalizeUrl(historyUrl);
  const encodedId = encodeURIComponent(entryId);
  await axios.delete(`${base}/${encodedId}`, {
    headers: getAuthHeaders(),
    timeout: 10000, // 10 seconds timeout
  });
};

export const fetchAnalytics = async (
  analyticsUrl: string,
  days: number = 7,
): Promise<AnalyticsSummary> => {
  try {
    const url = `${normalizeUrl(analyticsUrl)}?days=${days}`;
    const response = await axios.get<AnalyticsSummary>(url, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    // Return empty analytics on error
    return {
      status: "error",
      total_scans: 0,
      daing_scans: 0,
      non_daing_scans: 0,
      fish_type_distribution: {},
      average_confidence: {},
      daily_scans: {},
      color_consistency: {
        average_score: 0,
        grade_distribution: { Export: 0, Local: 0, Reject: 0 },
        by_fish_type: {},
      },
    };
  }
};

export const fetchAutoDataset = async (
  autoDatasetUrl: string,
): Promise<HistoryEntry[]> => {
  try {
    const response = await axios.get(normalizeUrl(autoDatasetUrl), {
      timeout: 10000,
    });
    const entries = response.data?.entries;
    if (Array.isArray(entries)) {
      return entries as HistoryEntry[];
    }
    return [];
  } catch (error: any) {
    return [];
  }
};

export const deleteAutoDatasetEntry = async (
  autoDatasetUrl: string,
  entryId: string,
): Promise<void> => {
  const base = normalizeUrl(autoDatasetUrl);
  const encodedId = encodeURIComponent(entryId);
  await axios.delete(`${base}/${encodedId}`, {
    timeout: 10000,
  });
};

// ============================================
// AUTHENTICATION API
// ============================================

// Helper to safely extract error message as string
const extractErrorMessage = (error: any, fallback: string): string => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors are arrays of objects with msg field
    return detail.map((d: any) => d?.msg || d?.message || String(d)).join(", ");
  }
  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return error?.message || fallback;
};

// Helper to map web backend user format to mobile User format
const mapWebUserToMobileUser = (webUser: any) => {
  if (!webUser) return undefined;
  return {
    id: webUser.id,
    username: webUser.name || webUser.username || "",
    email: webUser.email || "",
    role: webUser.role || "user",
    avatar: webUser.avatar_url || webUser.avatar,
    bio: webUser.bio,
    joined_at: webUser.created_at || webUser.joined_at,
  };
};

export const registerUser = async (
  baseUrl: string,
  username: string,
  email: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/auth/register`,
      {
        name: username,
        email,
        password,
        role: "user",
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    // Web backend returns { token, user, message } without status
    const data = response.data;
    return {
      status: "success",
      token: data.token,
      user: mapWebUserToMobileUser(data.user),
      message: data.message,
    };
  } catch (error: any) {
    return {
      status: "error",
      message: extractErrorMessage(error, "Registration failed"),
    };
  }
};

export const loginUser = async (
  baseUrl: string,
  username: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/auth/login`,
      {
        email: username,
        password,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    // Web backend returns { token, user } without status
    const data = response.data;
    return {
      status: "success",
      token: data.token,
      user: mapWebUserToMobileUser(data.user),
    };
  } catch (error: any) {
    return {
      status: "error",
      message: extractErrorMessage(error, "Login failed"),
    };
  }
};

export const googleSignIn = async (
  baseUrl: string,
  accessToken?: string,
  idToken?: string,
): Promise<AuthResponse> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/auth/google-signin`,
      {
        access_token: accessToken,
        id_token: idToken,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    const data = response.data;
    return {
      status: "success",
      token: data.token,
      user: mapWebUserToMobileUser(data.user),
    };
  } catch (error: any) {
    if (error.response?.data?.detail) {
      return { status: "error", message: error.response.data.detail };
    }
    return {
      status: "error",
      message: error.message || "Google sign-in failed",
    };
  }
};

export const logoutUser = async (baseUrl: string): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(
      `${normalizeUrl(baseUrl)}/auth/logout`,
      null,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    return { status: "error", message: error.message || "Logout failed" };
  }
};

export const getCurrentUser = async (
  baseUrl: string,
): Promise<AuthResponse> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/auth/me`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    const data = response.data;
    return {
      status: "success",
      user: mapWebUserToMobileUser(data.user || data),
    };
  } catch (error: any) {
    return { status: "error", message: "Not authenticated" };
  }
};

export const fetchAllHistory = async (
  baseUrl: string,
): Promise<HistoryEntry[]> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/history/all`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    const entries = response.data?.entries;
    if (Array.isArray(entries)) {
      return entries as HistoryEntry[];
    }
    return [];
  } catch (error: any) {
    return [];
  }
};

export const fetchAllAnalytics = async (
  baseUrl: string,
  days: number = 7,
): Promise<AnalyticsSummary> => {
  try {
    const response = await axios.get<AnalyticsSummary>(
      `${normalizeUrl(baseUrl)}/analytics/all?days=${days}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    return {
      status: "error",
      total_scans: 0,
      daing_scans: 0,
      non_daing_scans: 0,
      fish_type_distribution: {},
      average_confidence: {},
      daily_scans: {},
      color_consistency: {
        average_score: 0,
        grade_distribution: { Export: 0, Local: 0, Reject: 0 },
        by_fish_type: {},
      },
    };
  }
};

// ============================================
// CATALOG API
// ============================================

export const getCatalogProducts = async (
  baseUrl: string,
  params: {
    search?: string;
    category_id?: string;
    seller_id?: string;
    sort?: "latest" | "most_sold" | "price_low" | "price_high";
    page?: number;
    page_size?: number;
  } = {},
): Promise<{ products: SellerProduct[]; total: number }> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/catalog/products`,
      {
        params,
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return {
      products: response.data.products || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { products: [], total: 0 };
  }
};

export const getCatalogProductDetail = async (
  baseUrl: string,
  productId: string,
): Promise<SellerProduct | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/catalog/products/${productId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.product || null;
  } catch (error) {
    return null;
  }
};

export const getCatalogCategories = async (
  baseUrl: string,
): Promise<ProductCategory[]> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/catalog/categories`,
      {
        timeout: 10000,
      },
    );
    return response.data.categories || [];
  } catch (error) {
    return [];
  }
};

export const getCatalogSellers = async (
  baseUrl: string,
): Promise<{ id: string; name: string; product_count?: number }[]> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/catalog/sellers`,
      {
        timeout: 10000,
      },
    );
    return response.data.sellers || [];
  } catch (error) {
    return [];
  }
};

export const getSellerStoreProfile = async (
  baseUrl: string,
  sellerId: string,
): Promise<SellerProfile | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/catalog/sellers/${sellerId}`,
      {
        timeout: 10000,
      },
    );
    return response.data.seller || null;
  } catch (error) {
    return null;
  }
};

export const getProductReviews = async (
  baseUrl: string,
  productId: string,
  page: number = 1,
  pageSize: number = 5,
): Promise<{ reviews: ProductReview[]; total: number }> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/catalog/products/${productId}/reviews`,
      {
        params: { page, page_size: pageSize },
        timeout: 10000,
      },
    );
    return {
      reviews: response.data.reviews || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { reviews: [], total: 0 };
  }
};

// ============================================
// WISHLIST API
// ============================================

export const getWishlist = async (
  baseUrl: string,
): Promise<{ products: SellerProduct[]; total: number }> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/wishlist`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return {
      products: response.data.products || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { products: [], total: 0 };
  }
};

export const toggleWishlist = async (
  baseUrl: string,
  productId: string,
): Promise<{ in_wishlist: boolean }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/wishlist/${productId}`,
      null,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return { in_wishlist: response.data.in_wishlist ?? false };
  } catch (error) {
    return { in_wishlist: false };
  }
};

export const checkWishlist = async (
  baseUrl: string,
  productId: string,
): Promise<boolean> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/wishlist/check/${productId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.in_wishlist ?? false;
  } catch (error) {
    return false;
  }
};

export const getWishlistIds = async (baseUrl: string): Promise<string[]> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/wishlist/ids`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return response.data.product_ids || [];
  } catch (error) {
    return [];
  }
};

// ============================================
// CART API
// ============================================

export const getCart = async (
  baseUrl: string,
): Promise<{ items: CartItem[]; total_items: number }> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/cart`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return {
      items: response.data.items || [],
      total_items: response.data.total_items || 0,
    };
  } catch (error) {
    return { items: [], total_items: 0 };
  }
};

export const addToCart = async (
  baseUrl: string,
  productId: string,
  qty: number = 1,
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/cart/add`,
      {
        product_id: productId,
        qty,
      },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return {
      success: response.data.status === "success",
      message: response.data.message || "Added to cart",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Failed to add to cart",
    };
  }
};

export const updateCartItem = async (
  baseUrl: string,
  productId: string,
  qty: number,
): Promise<{ success: boolean }> => {
  try {
    await axios.patch(
      `${normalizeUrl(baseUrl)}/cart/${productId}`,
      { qty },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const removeFromCart = async (
  baseUrl: string,
  productId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(`${normalizeUrl(baseUrl)}/cart/${productId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

// ============================================
// ORDERS API
// ============================================

export const createOrder = async (
  baseUrl: string,
  address: OrderAddress,
  paymentMethod: string,
  sellerId?: string,
): Promise<{ success: boolean; orders: OrderDetail[]; message?: string }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/orders/checkout`,
      {
        address,
        payment_method: paymentMethod,
        seller_id: sellerId,
      },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 15000,
      },
    );
    return { success: true, orders: response.data.orders || [] };
  } catch (error: any) {
    return {
      success: false,
      orders: [],
      message: error.response?.data?.detail || "Checkout failed",
    };
  }
};

export const getOrders = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ orders: OrderDetail[]; total: number }> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/orders`, {
      params: { page, page_size: pageSize },
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return {
      orders: response.data.orders || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { orders: [], total: 0 };
  }
};

export const getOrderById = async (
  baseUrl: string,
  orderId: string,
): Promise<OrderDetail | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/orders/${orderId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.order || null;
  } catch (error) {
    return null;
  }
};

export const cancelOrder = async (
  baseUrl: string,
  orderId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.put(`${normalizeUrl(baseUrl)}/orders/${orderId}/cancel`, null, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const markOrderDelivered = async (
  baseUrl: string,
  orderId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.patch(
      `${normalizeUrl(baseUrl)}/orders/${orderId}/mark-delivered`,
      null,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

// ============================================
// PRODUCT REVIEWS API
// ============================================

export const getMyProductReview = async (
  baseUrl: string,
  productId: string,
): Promise<{ can_review: boolean; review: ProductReview | null }> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/products/${productId}/reviews/me`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return {
      can_review: response.data.can_review ?? false,
      review: response.data.review || null,
    };
  } catch (error) {
    return { can_review: false, review: null };
  }
};

export const createProductReview = async (
  baseUrl: string,
  productId: string,
  rating: number,
  comment: string,
): Promise<{ success: boolean; review?: ProductReview }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/products/${productId}/reviews`,
      {
        rating,
        comment,
      },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true, review: response.data.review };
  } catch (error) {
    return { success: false };
  }
};

export const updateMyProductReview = async (
  baseUrl: string,
  productId: string,
  rating?: number,
  comment?: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.patch(
      `${normalizeUrl(baseUrl)}/products/${productId}/reviews/me`,
      {
        rating,
        comment,
      },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const deleteMyProductReview = async (
  baseUrl: string,
  productId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(
      `${normalizeUrl(baseUrl)}/products/${productId}/reviews/me`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

// ============================================
// COMMUNITY API
// ============================================

export const getCommunityPosts = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 12,
  category: string = "All",
  search: string = "",
): Promise<{ posts: CommunityPost[]; total: number }> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/community/posts`,
      {
        params: { page, page_size: pageSize, category, search },
        timeout: 10000,
      },
    );
    return {
      posts: response.data.posts || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { posts: [], total: 0 };
  }
};

export const getCommunityPost = async (
  baseUrl: string,
  postId: string,
): Promise<{ post: CommunityPost | null; comments: CommunityComment[] }> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/community/posts/${postId}`,
      {
        timeout: 10000,
      },
    );
    return {
      post: response.data.post || null,
      comments: response.data.comments || [],
    };
  } catch (error) {
    return { post: null, comments: [] };
  }
};

export const getMyCommunityPosts = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ posts: MyCommunityPost[]; total: number }> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/community/posts/me`,
      {
        params: { page, page_size: pageSize },
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return {
      posts: response.data.posts || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { posts: [], total: 0 };
  }
};

export const createCommunityPost = async (
  baseUrl: string,
  title: string,
  description: string,
  category: string,
  images: { uri: string; name: string; type: string }[],
): Promise<{ success: boolean; post?: CommunityPost }> => {
  try {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    images.forEach((img) => {
      // @ts-ignore
      formData.append("images", img);
    });

    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/community/posts`,
      formData,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
        timeout: 30000,
      },
    );
    return { success: true, post: response.data.post };
  } catch (error) {
    return { success: false };
  }
};

export const toggleLikePost = async (
  baseUrl: string,
  postId: string,
): Promise<{ liked: boolean; likes: number }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/community/posts/${postId}/like`,
      null,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return {
      liked: response.data.liked ?? false,
      likes: response.data.likes ?? 0,
    };
  } catch (error) {
    return { liked: false, likes: 0 };
  }
};

export const addComment = async (
  baseUrl: string,
  postId: string,
  text: string,
): Promise<{ success: boolean; comment?: CommunityComment }> => {
  try {
    const formData = new FormData();
    formData.append("text", text);
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/community/posts/${postId}/comments`,
      formData,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
        timeout: 10000,
      },
    );
    return { success: true, comment: response.data.comment };
  } catch (error) {
    return { success: false };
  }
};

export const deleteComment = async (
  baseUrl: string,
  commentId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(
      `${normalizeUrl(baseUrl)}/community/comments/${commentId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const deleteCommunityPost = async (
  baseUrl: string,
  postId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(`${normalizeUrl(baseUrl)}/community/posts/${postId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

// ============================================
// SELLER API
// ============================================

export const getSellerKPIs = async (
  baseUrl: string,
): Promise<SellerKPIs | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/seller/analytics/kpis`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.kpis || null;
  } catch (error) {
    return null;
  }
};

export const getSellerProducts = async (
  baseUrl: string,
  params: {
    search?: string;
    category_id?: string;
    in_stock?: boolean;
    include_disabled?: boolean;
    page?: number;
    page_size?: number;
  } = {},
): Promise<{ products: SellerProduct[]; total: number }> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/seller/products`,
      {
        params,
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return {
      products: response.data.products || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { products: [], total: 0 };
  }
};

export const getSellerProduct = async (
  baseUrl: string,
  productId: string,
): Promise<SellerProduct | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/seller/products/${productId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.product || null;
  } catch (error) {
    return null;
  }
};

export const createSellerProduct = async (
  baseUrl: string,
  data: {
    name: string;
    description?: string;
    price: number;
    category_id?: string;
    stock_qty: number;
    status?: string;
  },
): Promise<{ success: boolean; product?: SellerProduct }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/seller/products`,
      data,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true, product: response.data.product };
  } catch (error) {
    return { success: false };
  }
};

export const updateSellerProduct = async (
  baseUrl: string,
  productId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    category_id?: string | null;
    stock_qty?: number;
    status?: string;
    main_image_index?: number;
  },
): Promise<{ success: boolean; product?: SellerProduct }> => {
  try {
    const response = await axios.patch(
      `${normalizeUrl(baseUrl)}/seller/products/${productId}`,
      data,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true, product: response.data.product };
  } catch (error) {
    return { success: false };
  }
};

export const deleteSellerProduct = async (
  baseUrl: string,
  productId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(
      `${normalizeUrl(baseUrl)}/seller/products/${productId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const toggleSellerProductDisabled = async (
  baseUrl: string,
  productId: string,
  disabled?: boolean,
): Promise<{ success: boolean; is_disabled: boolean }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/seller/products/${productId}/disable`,
      { disabled },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true, is_disabled: response.data.is_disabled ?? false };
  } catch (error) {
    return { success: false, is_disabled: false };
  }
};

export const uploadSellerProductImages = async (
  baseUrl: string,
  productId: string,
  images: { uri: string; name: string; type: string }[],
  mainIndex?: number,
): Promise<{ success: boolean; product?: SellerProduct }> => {
  try {
    const formData = new FormData();
    images.forEach((img) => {
      // @ts-ignore
      formData.append("images", img);
    });
    if (typeof mainIndex === "number") {
      formData.append("main_index", String(mainIndex));
    }

    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/seller/products/${productId}/images`,
      formData,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
        timeout: 30000,
      },
    );
    return { success: true, product: response.data.product };
  } catch (error) {
    return { success: false };
  }
};

export const deleteSellerProductImage = async (
  baseUrl: string,
  productId: string,
  index: number,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(
      `${normalizeUrl(baseUrl)}/seller/products/${productId}/images/${index}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const getSellerOrders = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ orders: OrderDetail[]; total: number }> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/orders/seller`, {
      params: { page, page_size: pageSize },
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return {
      orders: response.data.orders || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { orders: [], total: 0 };
  }
};

export const updateSellerOrderStatus = async (
  baseUrl: string,
  orderId: string,
  status: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.patch(
      `${normalizeUrl(baseUrl)}/orders/${orderId}/status`,
      { status },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const getSellerRecentOrders = async (
  baseUrl: string,
  limit: number = 3,
): Promise<RecentOrder[]> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/seller/analytics/orders/recent`,
      {
        params: { limit },
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.orders || [];
  } catch (error) {
    return [];
  }
};

export const getSellerTopProducts = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 4,
): Promise<{ products: TopProduct[]; total: number }> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/seller/analytics/products/top`,
      {
        params: { page, page_size: pageSize },
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return {
      products: response.data.products || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { products: [], total: 0 };
  }
};

export const getSellerSalesCategories = async (
  baseUrl: string,
): Promise<SalesCategory[]> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/seller/analytics/sales/categories`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.categories || [];
  } catch (error) {
    return [];
  }
};

export const getSellerRecentReviews = async (
  baseUrl: string,
  limit: number = 5,
): Promise<SellerReview[]> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/seller/analytics/reviews/recent`,
      {
        params: { limit },
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.reviews || [];
  } catch (error) {
    return [];
  }
};

// ============================================
// ADMIN API
// ============================================

export const getAdminUsers = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 20,
  role: string = "all",
  status: string = "all",
  search: string = "",
): Promise<{ users: AdminUser[]; total: number }> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/admin/users`, {
      params: { page, page_size: pageSize, role, status, search },
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    // Map users to add isActive boolean
    const users = (response.data.users || []).map((u: any) => ({
      ...u,
      isActive: u.status === "active",
    }));
    return {
      users,
      total: response.data.total || 0,
    };
  } catch (error) {
    return { users: [], total: 0 };
  }
};

export const getAdminUsersStats = async (
  baseUrl: string,
): Promise<AdminUsersStats | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/admin/users/stats`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.stats || null;
  } catch (error) {
    return null;
  }
};

export const getAdminUserDetail = async (
  baseUrl: string,
  userId: string,
): Promise<AdminUserDetail | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/admin/users/${userId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.user || null;
  } catch (error) {
    return null;
  }
};

export const toggleUserStatus = async (
  baseUrl: string,
  userId: string,
  reason: string,
): Promise<{ success: boolean; new_status?: string }> => {
  try {
    const response = await axios.put(
      `${normalizeUrl(baseUrl)}/admin/users/${userId}/toggle-status`,
      { reason },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true, new_status: response.data.new_status };
  } catch (error) {
    return { success: false };
  }
};

export const getAdminPosts = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 20,
  status: string = "all",
  search: string = "",
  category: string = "all",
): Promise<{ posts: AdminPost[]; total: number }> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/admin/posts`, {
      params: { page, page_size: pageSize, status, search, category },
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return {
      posts: response.data.posts || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { posts: [], total: 0 };
  }
};

export const togglePostStatus = async (
  baseUrl: string,
  postId: string,
  reason: string,
): Promise<{ success: boolean; new_status?: string }> => {
  try {
    const response = await axios.put(
      `${normalizeUrl(baseUrl)}/admin/posts/${postId}/toggle-status`,
      { reason },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true, new_status: response.data.new_status };
  } catch (error) {
    return { success: false };
  }
};

export const getAdminScans = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ entries: AdminScanEntry[]; total: number }> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/admin/scans`, {
      params: { page, page_size: pageSize },
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return {
      entries: response.data.entries || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { entries: [], total: 0 };
  }
};

export const toggleScanStatus = async (
  baseUrl: string,
  scanId: string,
  reason?: string,
): Promise<{ success: boolean; is_disabled: boolean }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/admin/scans/${scanId}/disable`,
      null,
      {
        params: { reason: reason || "" },
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return { success: true, is_disabled: response.data.is_disabled ?? false };
  } catch (error) {
    return { success: false, is_disabled: false };
  }
};

export const deleteAdminScan = async (
  baseUrl: string,
  scanId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(`${normalizeUrl(baseUrl)}/admin/scans/${scanId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const getAdminAuditLogs = async (
  baseUrl: string,
  params: {
    category?: string;
    status?: string;
    actor?: string;
    limit?: number;
  } = {},
): Promise<AdminAuditLogEntry[]> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/admin/audit-logs`,
      {
        params,
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.entries || [];
  } catch (error) {
    return [];
  }
};

export const getAdminOrders = async (
  baseUrl: string,
  page: number = 1,
  pageSize: number = 20,
  status: string = "all",
  seller: string = "all",
  category: string = "all",
  search: string = "",
): Promise<{ orders: AdminOrder[]; total: number }> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/admin/orders`, {
      params: { page, page_size: pageSize, status, seller, category, search },
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return {
      orders: response.data.orders || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { orders: [], total: 0 };
  }
};

export const getAdminOrderDetail = async (
  baseUrl: string,
  orderId: string,
): Promise<AdminOrderDetail | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/admin/orders/${orderId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.order || null;
  } catch (error) {
    return null;
  }
};

export const updateAdminOrderStatus = async (
  baseUrl: string,
  orderId: string,
  status: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.put(
      `${normalizeUrl(baseUrl)}/admin/orders/${orderId}/status`,
      { status },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

// ============================================
// ADMIN DASHBOARD HELPERS (use API_BASE_URL by default)
// ============================================

// Wrapper for admin users stats without needing baseUrl
export const getAdminUsersStatsSimple =
  async (): Promise<AdminUsersStats | null> => {
    return getAdminUsersStats(API_BASE_URL);
  };

// Get recent orders for admin dashboard
export const getAdminRecentOrders = async (
  limit: number = 5,
): Promise<AdminOrder[]> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(API_BASE_URL)}/admin/orders`,
      {
        params: { page: 1, page_size: limit },
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.orders || [];
  } catch (error) {
    return [];
  }
};

// Get recent scans for admin dashboard
export const getAdminRecentScans = async (
  limit: number = 5,
): Promise<AdminScanEntry[]> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(API_BASE_URL)}/admin/scans`,
      {
        params: { page: 1, page_size: limit },
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.scans || [];
  } catch (error) {
    return [];
  }
};

// Wrapper for admin users list
export const getAdminUsersSimple = async (
  page: number = 1,
  pageSize: number = 20,
  role: string = "all",
  status: string = "all",
  search: string = "",
): Promise<{ users: AdminUser[]; total: number }> => {
  return getAdminUsers(API_BASE_URL, page, pageSize, role, status, search);
};

// Update user role (wrapper without baseUrl)
export const updateUserRole = async (
  userId: string,
  role: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.put(
      `${normalizeUrl(API_BASE_URL)}/admin/users/${userId}/role`,
      { role },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

// Toggle user status - wrapper without baseUrl (simplified signature)
export const toggleUserStatusSimple = async (
  userId: string,
  activate: boolean,
): Promise<{ success: boolean }> => {
  return toggleUserStatus(
    API_BASE_URL,
    userId,
    activate ? "reactivating" : "deactivating",
  );
};

// ============================================
// VOUCHERS API
// ============================================

export const listVouchers = async (
  baseUrl: string,
  filterStatus: string = "all",
  sellerId?: string,
): Promise<Voucher[]> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/api/vouchers`, {
      params: { filter_by: filterStatus, seller_id: sellerId },
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return response.data.vouchers || [];
  } catch (error) {
    return [];
  }
};

export const getVoucher = async (
  baseUrl: string,
  voucherId: string,
): Promise<Voucher | null> => {
  try {
    const response = await axios.get(
      `${normalizeUrl(baseUrl)}/api/vouchers/${voucherId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    return response.data.voucher || null;
  } catch (error) {
    return null;
  }
};

export const createVoucher = async (
  baseUrl: string,
  data: {
    code: string;
    discount_type: "fixed" | "percentage";
    value: number;
    expiration_date?: string | null;
    max_uses?: number | null;
    per_user_limit?: number | null;
    min_order_amount?: number | null;
  },
): Promise<{ success: boolean; voucher?: Voucher }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/api/vouchers`,
      data,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true, voucher: response.data.voucher };
  } catch (error) {
    return { success: false };
  }
};

export const updateVoucher = async (
  baseUrl: string,
  voucherId: string,
  data: Partial<{
    code: string;
    discount_type: "fixed" | "percentage";
    value: number;
    expiration_date?: string | null;
    max_uses?: number | null;
    per_user_limit?: number | null;
    min_order_amount?: number | null;
    active: boolean;
  }>,
): Promise<{ success: boolean }> => {
  try {
    await axios.put(
      `${normalizeUrl(baseUrl)}/api/vouchers/${voucherId}`,
      data,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const deleteVoucher = async (
  baseUrl: string,
  voucherId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(`${normalizeUrl(baseUrl)}/api/vouchers/${voucherId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const validateVoucher = async (
  baseUrl: string,
  code: string,
  orderTotal: number,
): Promise<{
  valid: boolean;
  discount_value: number;
  discount_type: "fixed" | "percentage";
  voucher_id?: string;
}> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/api/vouchers/validate`,
      {
        code,
        order_total: orderTotal,
      },
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return {
      valid: response.data.valid ?? false,
      discount_value: response.data.discount_value ?? 0,
      discount_type: response.data.discount_type ?? "fixed",
      voucher_id: response.data.voucher_id,
    };
  } catch (error) {
    return { valid: false, discount_value: 0, discount_type: "fixed" };
  }
};

// ============================================
// CONTACT API
// ============================================

export const sendContactMessage = async (
  baseUrl: string,
  data: {
    name: string;
    email: string;
    contact_number?: string;
    subject: string;
    message: string;
  },
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/contact`,
      data,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return {
      success: response.data.status === "success",
      message: response.data.message || "Message sent",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Failed to send message",
    };
  }
};

// ============================================
// CATEGORIES API (for sellers/admins)
// ============================================

export const getCategories = async (
  baseUrl: string,
): Promise<ProductCategory[]> => {
  try {
    const response = await axios.get(`${normalizeUrl(baseUrl)}/categories`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return response.data.categories || [];
  } catch (error) {
    return [];
  }
};

export const createCategory = async (
  baseUrl: string,
  data: { name: string; description?: string },
): Promise<{ success: boolean; category?: ProductCategory }> => {
  try {
    const response = await axios.post(
      `${normalizeUrl(baseUrl)}/categories`,
      data,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true, category: response.data.category };
  } catch (error) {
    return { success: false };
  }
};

export const updateCategory = async (
  baseUrl: string,
  categoryId: string,
  data: { name?: string; description?: string },
): Promise<{ success: boolean }> => {
  try {
    await axios.patch(
      `${normalizeUrl(baseUrl)}/categories/${categoryId}`,
      data,
      {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        timeout: 10000,
      },
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const deleteCategory = async (
  baseUrl: string,
  categoryId: string,
): Promise<{ success: boolean }> => {
  try {
    await axios.delete(`${normalizeUrl(baseUrl)}/categories/${categoryId}`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};
