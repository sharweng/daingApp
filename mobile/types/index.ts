export type Screen =
  | "home"
  | "scan"
  | "analytics"
  | "history"
  | "autoDataset"
  | "login"
  | "register"
  // Ecommerce screens
  | "catalog"
  | "productDetail"
  | "wishlist"
  | "cart"
  | "checkout"
  | "orderSuccess"
  // User screens
  | "userProfile"
  | "userOrders"
  | "orderDetail"
  | "userActivity"
  // Seller screens
  | "sellerDashboard"
  | "sellerProducts"
  | "sellerProductEdit"
  | "sellerOrders"
  | "sellerOrderDetail"
  | "sellerReviews"
  | "sellerDiscounts"
  | "sellerDiscountEdit"
  // Admin screens
  | "adminDashboard"
  | "adminUsers"
  | "adminUserDetail"
  | "adminPosts"
  | "adminPostDetail"
  | "adminScans"
  | "adminAuditLogs"
  | "adminOrders"
  | "adminOrderDetail"
  | "adminVouchers"
  | "adminMarket"
  | "adminProductDetail"
  // Community screens
  | "community"
  | "communityPostDetail"
  | "communityCreate"
  | "myPosts"
  // Seller store (public)
  | "sellerStore"
  // Other
  | "contact"
  | "about"
  | "publications";

export type UserRole = "user" | "admin" | "seller";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  joined_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  status: string;
  user?: User;
  token?: string;
  message?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  timestamp: string;
  folder?: string;
  user_id?: string;
  // Analysis data (optional for backwards compatibility)
  detections?: Array<{
    fish_type: string;
    confidence: number;
  }>;
  color_analysis?: {
    consistency_score?: number;
    quality_grade?: string;
    color_stats?: Array<{
      combined_std?: number;
    }>;
  };
  mold_analysis?: {
    avg_coverage_percent?: number;
    overall_severity?: string;
    fish_results?: Array<{
      mold_detected?: boolean;
      mold_coverage_percent?: number;
      severity?: string;
    }>;
  };
  quality_grade?: string;
  is_daing_detected?: boolean;
}

export interface ColorConsistencyStats {
  average_score: number;
  grade_distribution: {
    Export: number;
    Local: number;
    Reject: number;
  };
  by_fish_type: Record<string, { avg_score: number; count: number }>;
}

// Mold Analysis Types
export interface MoldSpatialZone {
  patch_count: number;
  coverage_pixels: number;
  fish_pixels: number;
  coverage_percent: number;
}

export interface MoldFishResult {
  region_index: number;
  mold_detected: boolean;
  mold_coverage_percent: number;
  severity: "None" | "Low" | "Moderate" | "Severe";
  patch_count: number;
  spatial_distribution: {
    zones: Record<string, MoldSpatialZone>;
    center_coords: [number, number] | null;
    total_patches: number;
  };
  characteristics: {
    dominant_color: string | null;
    color_variance: number;
    avg_darkness: number;
  };
}

export interface MoldAnalysisResult {
  overall_severity: "None" | "Low" | "Moderate" | "Severe";
  avg_coverage_percent: number;
  fish_analyzed: number;
  fish_with_mold: number;
  total_patches: number;
  fish_results: MoldFishResult[];
  spatial_summary: {
    zones: Record<
      string,
      { total_patches: number; total_coverage: number; fish_affected: number }
    >;
    total_fish_analyzed: number;
    most_affected_zone: string | null;
  };
  characteristics: {
    most_common_color: string | null;
    avg_darkness: number;
    color_distribution: Record<string, number>;
  };
  analysis_method: string;
}

export interface MoldAnalyticsStats {
  severity_distribution: {
    None: number;
    Low: number;
    Moderate: number;
    Severe: number;
  };
  average_coverage: number;
  spatial_zones: Record<
    string,
    { fish_affected: number; total_patches: number }
  >;
  by_fish_type: Record<
    string,
    {
      total_scans: number;
      contaminated_scans: number;
      contamination_rate: number;
      avg_coverage: number;
    }
  >;
}

// Per-fish color analysis stats
export interface ColorFishStats {
  region_index: number;
  l_std: number;
  a_std: number;
  b_std: number;
  l_mean: number;
  a_mean: number;
  b_mean: number;
  combined_std: number;
  rgb_std: number[];
  pixel_count: number;
  coverage_percent: number;
}

export interface AnalysisScanResult {
  status: string;
  is_daing_detected: boolean;
  result_image: string;
  detections: Array<{ fish_type: string; confidence: number }>;
  color_analysis: {
    consistency_score: number;
    quality_grade: string;
    avg_std_deviation: number;
    color_stats?: ColorFishStats[];
  } | null;
  mold_analysis: MoldAnalysisResult | null;
}

// Defect Pattern Analysis Types
export interface DefectFrequency {
  poor_color_uniformity: number;
  color_discoloration: number;
  acceptable_quality: number;
}

export interface SpeciesSusceptibility {
  total_affected: number;
  total_scans: number;
  defect_rate: number;
  reject_count: number;
  local_count: number;
  avg_color_score: number;
  primary_issue: string;
}

export interface DefectPatterns {
  frequency: DefectFrequency;
  species_susceptibility: Record<string, SpeciesSusceptibility>;
  most_common_defect: string | null;
}

// Quality Grade Classification Types
export interface GradeStats {
  count: number;
  avg_confidence: number;
  avg_color_score: number;
}

export interface QualityBySpecies {
  Export: GradeStats;
  Local: GradeStats;
  Reject: GradeStats;
}

export interface QualityClassification {
  by_species: Record<string, QualityBySpecies>;
  by_date: Record<string, { Export: number; Local: number; Reject: number }>;
  summary: {
    export_rate: number;
    local_rate: number;
    reject_rate: number;
  };
}

export interface AnalyticsSummary {
  status: string;
  total_scans: number;
  daing_scans: number;
  non_daing_scans: number;
  fish_type_distribution: Record<string, number>;
  average_confidence: Record<string, number>;
  daily_scans: Record<string, number>;
  color_consistency?: ColorConsistencyStats;
  mold_analysis?: MoldAnalyticsStats;
  defect_patterns?: DefectPatterns;
  quality_classification?: QualityClassification;
}

// ========== ECOMMERCE TYPES ==========

// Product types
export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  url: string;
  public_id?: string;
  uploaded_at?: string;
}

export interface SellerProduct {
  id: string;
  seller_id: string;
  seller_name: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string | null;
  category_name?: string;
  stock_qty: number;
  status: string;
  images: ProductImage[];
  main_image_index: number;
  is_disabled: boolean;
  sold_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  seller_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

// Cart types
export interface CartItem {
  product: SellerProduct;
  qty: number;
}

// Order types
export interface OrderAddress {
  full_name?: string;
  fullName?: string;
  phone: string;
  address_line?: string;
  address?: string;
  city: string;
  province: string;
  postal_code?: string;
  postalCode?: string;
  notes?: string;
}

export interface OrderItem {
  product_id: string;
  seller_id?: string;
  seller_name?: string;
  name: string;
  price: number;
  qty?: number;
  quantity?: number;
  image_url?: string;
  image?: string;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  orderNumber?: string;
  seller_id?: string;
  seller_name?: string;
  status: string;
  total: number;
  total_items: number;
  payment_method: string;
  paymentMethod?: string;
  address: OrderAddress;
  items: OrderItem[];
  created_at: string;
  dateOrdered?: string;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
}

// Community types
export interface CommunityPost {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  likes: number;
  liked_by: string[];
  comments_count: number;
  shares: number;
  created_at: string;
}

export interface MyCommunityPost {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  author_id: string;
  author_name: string;
  likes: number;
  comments_count: number;
  created_at: string;
  status: "published" | "draft" | "deleted";
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  text: string;
  created_at: string;
}

// ========== SELLER TYPES ==========

export interface SellerProfile {
  id: string;
  name: string;
  avatar_url?: string | null;
  bio?: string | null;
  joined_at?: string | null;
  product_count: number;
  total_sold: number;
  avg_rating?: number | null;
  total_reviews: number;
}

export interface SellerKPIs {
  total_products: number;
  total_orders: number;
  total_earnings: number;
  average_rating: number;
  products_change: number;
  orders_change: number;
  earnings_change: number;
  rating_change: number;
}

export interface SellerReview {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  product_name: string;
  created_at: string;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer: string;
  total: number;
  status: string;
  created_at: string;
  items_count?: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sold: number;
  price: number;
  stock: number;
  category_name?: string;
}

export interface SalesCategory {
  category: string;
  sold: number;
  percentage: number;
}

// ========== ADMIN TYPES ==========

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "seller" | "user";
  status: "active" | "inactive";
  avatar: string;
  joined_at: string;
  orders_count: number;
  products_count: number;
  deactivation_reason: string;
  isActive: boolean; // Computed from status === "active"
}

export interface AdminUserDetail extends AdminUser {
  deactivated_at: string;
  reactivated_at: string;
  scans_count: number;
}

export interface AdminUsersStats {
  total: number;
  admins: number;
  sellers: number;
  users: number;
  active: number;
  inactive: number;
}

export interface AdminPost {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  likes: number;
  comments_count: number;
  status: "active" | "deleted" | "disabled";
  created_at: string;
  updated_at: string;
  disable_reason: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  buyer_name: string;
  buyer_id: string;
  seller_name: string;
  seller_id: string;
  category: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  total: number;
  total_items: number;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderDetail extends AdminOrder {
  items: OrderItem[];
  address: OrderAddress;
  payment_method: string;
}

export interface AdminScanEntry {
  id: string;
  timestamp: string;
  url?: string | null;
  fish_type: string;
  grade: string;
  score: number | null;
  user_name: string;
  user_id?: string | null;
  detected: boolean;
  is_disabled?: boolean;
}

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  category: string;
  entity: string;
  entity_id: string;
  status: string;
  ip: string;
  details: string;
}

// Voucher types
export interface Voucher {
  id: string;
  code: string;
  discount_type: "fixed" | "percentage";
  value: number;
  seller_id?: string;
  expiration_date?: string | null;
  max_uses?: number | null;
  per_user_limit?: number | null;
  min_order_amount?: number | null;
  used_count: number;
  active: boolean;
  created_at: string;
}

// Navigation params
export interface NavigationParams {
  productId?: string;
  orderId?: string;
  postId?: string;
  userId?: string;
  sellerId?: string;
  voucherId?: string;
}
