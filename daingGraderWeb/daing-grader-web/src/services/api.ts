import axios from 'axios'
import { auth } from './firebase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Add JWT token; for FormData leave Content-Type unset so browser sets multipart boundary
api.interceptors.request.use(async (config) => {
  const firebaseUser = auth.currentUser
  if (firebaseUser) {
    const token = await firebaseUser.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  } else {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/** GET history entries from Cloudinary (same as mobile). */
export interface HistoryEntry {
  id: string
  timestamp: string
  url: string
  folder: string
}

export async function getHistory(signal?: AbortSignal): Promise<HistoryEntry[]> {
  const response = await api.get<{ status: string; entries: HistoryEntry[] }>('/history', { signal })
  // Backend returns { status: "success", entries: [...] } - parse accordingly
  if (response.data.status !== 'success' || !Array.isArray(response.data.entries)) {
    return []
  }
  return response.data.entries
}

/** GET detailed history entries with fish_type and grade from MongoDB. */
export interface DetailedHistoryEntry {
  id: string
  timestamp: string
  url: string
  fish_type: string
  grade: string
  score?: number | null
}

export interface DetailedHistoryResponse {
  status: string
  entries: DetailedHistoryEntry[]
  fish_types: string[]
}

export async function getDetailedHistory(signal?: AbortSignal): Promise<DetailedHistoryResponse> {
  const response = await api.get<DetailedHistoryResponse>('/history/detailed', { signal })
  if (response.data.status !== 'success') {
    return { status: 'error', entries: [], fish_types: [] }
  }
  return response.data
}

/** Admin scans (web backend): paginated table. */
export interface AdminScanEntry {
  id: string
  timestamp: string
  url?: string | null
  fish_type: string
  grade: string
  score: number | null
  user_name: string
  user_id?: string | null
  detected: boolean
}

export interface AdminScanPage {
  status: string
  page: number
  page_size: number
  total: number
  entries: AdminScanEntry[]
}

export interface AdminScanMonthSummary {
  key: string
  label: string
  count: number
}

export async function getAdminScanPage(page = 1, pageSize = 10): Promise<AdminScanPage> {
  const response = await api.get<AdminScanPage>('/admin/scans', {
    params: { page, page_size: pageSize },
  })
  return response.data
}

export async function getAdminScanSummary(year: number): Promise<{ status: string; year: number; months: AdminScanMonthSummary[] }> {
  const response = await api.get<{ status: string; year: number; months: AdminScanMonthSummary[] }>('/admin/scans/summary', {
    params: { year },
  })
  return response.data
}

/** Admin scans stats - quick stats for dashboard. */
export interface AdminScanStats {
  total_scans: number
  export_count: number
  local_count: number
  reject_count: number
  disabled_count: number
  unique_users: number
  avg_score: number
}

export async function getAdminScanStats(): Promise<{ status: string; stats: AdminScanStats }> {
  const response = await api.get<{ status: string; stats: AdminScanStats }>('/admin/scans/stats')
  return response.data
}

/** Admin audit logs - activity feed for admin page. */
export interface AdminAuditLogEntry {
  id: string
  timestamp: string
  actor: string
  role: string
  action: string
  category: string
  entity: string
  entity_id: string
  status: string
  ip: string
  details: string
}

export interface AdminAuditLogsResponse {
  status: string
  entries: AdminAuditLogEntry[]
}

export interface UserActivityLogEntry {
  id: string
  timestamp: string
  actor: string
  role: string
  action: string
  category: string
  entity: string
  entity_id: string
  status: string
  details: string
}

export interface UserActivityLogsResponse {
  status: string
  entries: UserActivityLogEntry[]
  total: number
}

export async function getAdminAuditLogs(
  params: { category?: string; status?: string; actor?: string; limit?: number } = {}
): Promise<AdminAuditLogsResponse> {
  const response = await api.get<AdminAuditLogsResponse>('/admin/audit-logs', { params })
  return response.data
}

export async function getMyActivityLogs(page = 1, pageSize = 10): Promise<UserActivityLogsResponse> {
  const response = await api.get<UserActivityLogsResponse>('/activity/me', {
    params: { page, page_size: pageSize },
  })
  return response.data
}

/** Disable/enable a scan (soft delete). */
export async function toggleScanStatus(scanId: string, reason?: string): Promise<{ status: string; message: string; is_disabled: boolean }> {
  const response = await api.post<{ status: string; message: string; is_disabled: boolean }>(`/admin/scans/${scanId}/disable`, null, {
    params: { reason: reason || '' },
  })
  return response.data
}

/** Permanently delete a scan from Cloudinary and database. */
export async function deleteAdminScan(scanId: string): Promise<{ status: string; message: string }> {
  const response = await api.delete<{ status: string; message: string }>(`/admin/scans/${scanId}`)
  return response.data
}

/** Contact form payload - used by Contact page. */
export interface ContactPayload {
  name: string
  email: string
  contact_number?: string
  subject: string
  message: string
}

/** POST contact form; sends email to CONTACT_EMAIL (shathesisgroup@gmail.com). */
export async function sendContactMessage(payload: ContactPayload): Promise<{ status: string; message: string }> {
  const response = await api.post<{ status: string; message: string }>('/contact', payload)
  return response.data
}

/** POST image to /analyze; returns blob (image/jpeg). Used by Grade page. */
export async function analyzeImage(file: File): Promise<Blob> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post<Blob>('/analyze', formData, { responseType: 'blob' })
  return response.data
}

// --- Seller Products & Categories ---

export interface ProductCategory {
  id: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface ProductImage {
  url: string
  public_id?: string
  uploaded_at?: string
}

export interface ProductReview {
  id: string
  product_id: string
  seller_id: string
  user_id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
  updated_at: string
}

export interface MyProductReviewResponse {
  status: string
  can_review: boolean
  review: ProductReview | null
}

export interface SellerProduct {
  id: string
  seller_id: string
  seller_name: string
  name: string
  description?: string
  price: number
  category_id?: string | null
  category_name?: string
  stock_qty: number
  status: string
  images: ProductImage[]
  main_image_index: number
  is_disabled: boolean
  sold_count?: number
  created_at?: string
  updated_at?: string
}

export interface CatalogSeller {
  id: string
  name: string
  product_count?: number
  total_sold?: number
}

export interface SellerProfile {
  id: string
  name: string
  avatar_url?: string | null
  bio?: string | null
  joined_at?: string | null
  product_count: number
  total_sold: number
  avg_rating?: number | null
  total_reviews: number
}

export async function getCategories(): Promise<{ status: string; categories: ProductCategory[] }> {
  const response = await api.get<{ status: string; categories: ProductCategory[] }>('/categories')
  return response.data
}

export async function createCategory(payload: { name: string; description?: string }): Promise<{ status: string; category: ProductCategory }> {
  const response = await api.post<{ status: string; category: ProductCategory }>('/categories', payload)
  return response.data
}

export async function updateCategory(categoryId: string, payload: { name?: string; description?: string }): Promise<{ status: string; category: ProductCategory }> {
  const response = await api.patch<{ status: string; category: ProductCategory }>(`/categories/${categoryId}`, payload)
  return response.data
}

export async function deleteCategory(categoryId: string): Promise<{ status: string }> {
  const response = await api.delete<{ status: string }>(`/categories/${categoryId}`)
  return response.data
}

export async function getSellerProducts(params: {
  search?: string
  category_id?: string
  in_stock?: boolean
  include_disabled?: boolean
  page?: number
  page_size?: number
} = {}): Promise<{ status: string; products: SellerProduct[]; total: number; page: number; page_size: number }> {
  const response = await api.get<{ status: string; products: SellerProduct[]; total: number; page: number; page_size: number }>(
    '/seller/products',
    { params }
  )
  return response.data
}

export async function getSellerProduct(productId: string): Promise<{ status: string; product: SellerProduct }> {
  const response = await api.get<{ status: string; product: SellerProduct }>(`/seller/products/${productId}`)
  return response.data
}

export async function createSellerProduct(payload: {
  name: string
  description?: string
  price: number
  category_id?: string
  stock_qty: number
  status?: string
}): Promise<{ status: string; product: SellerProduct }> {
  const response = await api.post<{ status: string; product: SellerProduct }>('/seller/products', payload)
  return response.data
}

export async function updateSellerProduct(productId: string, payload: {
  name?: string
  description?: string
  price?: number
  category_id?: string | null
  stock_qty?: number
  status?: string
  main_image_index?: number
}): Promise<{ status: string; product: SellerProduct }> {
  const response = await api.patch<{ status: string; product: SellerProduct }>(`/seller/products/${productId}`, payload)
  return response.data
}

export async function toggleSellerProductDisabled(productId: string, disabled?: boolean): Promise<{ status: string; is_disabled: boolean }> {
  const response = await api.post<{ status: string; is_disabled: boolean }>(`/seller/products/${productId}/disable`, { disabled })
  return response.data
}

export async function deleteSellerProduct(productId: string): Promise<{ status: string }> {
  const response = await api.delete<{ status: string }>(`/seller/products/${productId}`)
  return response.data
}

export async function uploadSellerProductImages(productId: string, images: File[], mainIndex?: number): Promise<{ status: string; product: SellerProduct }> {
  const formData = new FormData()
  images.forEach((img) => formData.append('images', img))
  if (typeof mainIndex === 'number') formData.append('main_index', String(mainIndex))
  const response = await api.post<{ status: string; product: SellerProduct }>(`/seller/products/${productId}/images`, formData)
  return response.data
}

export async function deleteSellerProductImage(productId: string, index: number): Promise<{ status: string; product: SellerProduct }> {
  const response = await api.delete<{ status: string; product: SellerProduct }>(`/seller/products/${productId}/images/${index}`)
  return response.data
}

export async function getSellerProductReviews(productId: string, page = 1, pageSize = 5): Promise<{ status: string; reviews: ProductReview[]; total: number; page: number; page_size: number }> {
  // Public endpoint for displaying product reviews (no auth required)
  const response = await api.get<{ status: string; reviews: ProductReview[]; total: number; page: number; page_size: number }>(
    `/catalog/products/${productId}/reviews`,
    { params: { page, page_size: pageSize } }
  )
  return response.data
}

export async function getMyProductReview(productId: string): Promise<MyProductReviewResponse> {
  const response = await api.get<MyProductReviewResponse>(`/products/${productId}/reviews/me`)
  return response.data
}

export async function createProductReview(productId: string, payload: { rating: number; comment: string }): Promise<{ status: string; review: ProductReview }> {
  const response = await api.post<{ status: string; review: ProductReview }>(`/products/${productId}/reviews`, payload)
  return response.data
}

export async function updateMyProductReview(productId: string, payload: { rating?: number; comment?: string }): Promise<{ status: string; review: ProductReview }> {
  const response = await api.patch<{ status: string; review: ProductReview }>(`/products/${productId}/reviews/me`, payload)
  return response.data
}

export async function deleteMyProductReview(productId: string): Promise<{ status: string; message: string }> {
  const response = await api.delete<{ status: string; message: string }>(`/products/${productId}/reviews/me`)
  return response.data
}

export async function getCatalogCategories(): Promise<{ status: string; categories: ProductCategory[] }> {
  const response = await api.get<{ status: string; categories: ProductCategory[] }>('/catalog/categories')
  return response.data
}

// --- Cart API ---
export interface CartItem {
  product: SellerProduct
  qty: number
}

export async function addToCart(productId: string, qty = 1): Promise<{ status: string; message: string; in_cart?: boolean }> {
  const response = await api.post<{ status: string; message: string; in_cart?: boolean }>('/cart/add', {
    product_id: productId,
    qty,
  })
  return response.data
}

export async function getCart(): Promise<{ status: string; items: CartItem[]; total_items: number }> {
  const response = await api.get<{ status: string; items: CartItem[]; total_items: number }>('/cart')
  return response.data
}

export async function updateCartItem(productId: string, qty: number): Promise<{ status: string; message: string }> {
  const response = await api.patch<{ status: string; message: string }>(`/cart/${productId}`, {
    qty,
  })
  return response.data
}

export async function removeFromCart(productId: string): Promise<{ status: string; message: string }> {
  const response = await api.delete<{ status: string; message: string }>(`/cart/${productId}`)
  return response.data
}

// --- Orders API ---
export interface OrderAddress {
  full_name: string
  phone: string
  address_line: string
  city: string
  province: string
  postal_code: string
  notes?: string
}

export interface OrderItem {
  product_id: string
  seller_id?: string
  seller_name?: string
  name: string
  price: number
  qty: number
  image_url?: string
}

export interface OrderDetail {
  id: string
  order_number: string
  seller_id?: string
  seller_name?: string
  status: string
  total: number
  total_items: number
  payment_method: string
  address: OrderAddress
  items: OrderItem[]
  created_at: string
}

export async function createOrder(payload: { address: OrderAddress; payment_method: string; seller_id?: string }): Promise<{
  status: string
  orders: OrderDetail[]
  order_ids: string[]
  order?: OrderDetail | null
  email_status?: { order_id?: string; buyer_sent: boolean; seller_sent: boolean; buyer_error?: string; seller_error?: string }[]
}> {
  const response = await api.post<{
    status: string
    orders: OrderDetail[]
    order_ids: string[]
    order?: OrderDetail | null
    email_status?: { order_id?: string; buyer_sent: boolean; seller_sent: boolean; buyer_error?: string; seller_error?: string }[]
  }>('/orders/checkout', payload)
  return response.data
}

export async function getOrders(page = 1, pageSize = 10): Promise<{ status: string; orders: OrderDetail[]; total: number }> {
  const response = await api.get<{ status: string; orders: OrderDetail[]; total: number }>('/orders', {
    params: { page, page_size: pageSize },
  })
  return response.data
}

export async function getSellerOrders(page = 1, pageSize = 10): Promise<{ status: string; orders: OrderDetail[]; total: number }> {
  const response = await api.get<{ status: string; orders: OrderDetail[]; total: number }>('/orders/seller', {
    params: { page, page_size: pageSize },
  })
  return response.data
}

export async function getOrderById(orderId: string): Promise<{ status: string; order: OrderDetail }> {
  const response = await api.get<{ status: string; order: OrderDetail }>(`/orders/${orderId}`)
  return response.data
}

export async function downloadOrderReceipt(orderId: string): Promise<{ blob: Blob; filename: string }> {
  const response = await api.get(`/orders/${orderId}/receipt.pdf`, { responseType: 'blob' })
  const disposition = response.headers?.['content-disposition'] || ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const filename = match?.[1] || `receipt-${orderId}.pdf`
  return { blob: response.data as Blob, filename }
}

export async function updateSellerOrderStatus(orderId: string, status: string): Promise<{ status: string; order: OrderDetail }> {
  const response = await api.patch<{ status: string; order: OrderDetail }>(`/orders/${orderId}/status`, { status })
  return response.data
}

export async function markOrderDelivered(orderId: string): Promise<{ status: string; order: OrderDetail }> {
  const response = await api.patch<{ status: string; order: OrderDetail }>(`/orders/${orderId}/mark-delivered`)
  return response.data
}

export async function cancelOrder(orderId: string): Promise<{ status: string; order: OrderDetail }> {
  const response = await api.put<{ status: string; order: OrderDetail }>(`/orders/${orderId}/cancel`)
  return response.data
}

export async function getCatalogSellers(): Promise<{ status: string; sellers: CatalogSeller[] }> {
  const response = await api.get<{ status: string; sellers: CatalogSeller[] }>('/catalog/sellers')
  return response.data
}

export async function getSellerStoreProfile(sellerId: string): Promise<{ status: string; seller: SellerProfile }> {
  const response = await api.get<{ status: string; seller: SellerProfile }>(`/catalog/sellers/${sellerId}`)
  return response.data
}

export async function getCatalogProducts(params: {
  search?: string
  category_id?: string
  seller_id?: string
  sort?: 'latest' | 'most_sold' | 'price_low' | 'price_high'
  page?: number
  page_size?: number
} = {}): Promise<{ status: string; products: SellerProduct[]; total: number; page: number; page_size: number }> {
  const response = await api.get<{ status: string; products: SellerProduct[]; total: number; page: number; page_size: number }>(
    '/catalog/products',
    { params }
  )
  return response.data
}

export async function importSellerProductsCsv(file: File): Promise<{ status: string; inserted: number; errors: { row: number; error: string }[] }> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post<{ status: string; inserted: number; errors: { row: number; error: string }[] }>(
    '/seller/products/import-csv',
    formData
  )
  return response.data
}

/**
 * Test if the web app can reach the backend (for Profile button connection test).
 * Uses GET / which returns {"status": "ok"} when the backend is up.
 */
export async function checkBackendConnection(): Promise<void> {
  try {
    await api.get('/')
  } catch (err: unknown) {
    const ax = err as { response?: { status?: number }; code?: string; message?: string }
    if (ax.response != null) return
    if (ax.code === 'ERR_CANCELED') return
    if (ax.code === 'ECONNREFUSED' || ax.message?.includes('Network Error')) {
      throw new Error('Could not connect to backend.')
    }
    throw err
  }
}

// --- Community Posts ---

export interface CommunityPost {
  id: string
  title: string
  description: string
  images: string[]
  category: string
  author_id: string
  author_name: string
  author_avatar: string
  likes: number
  liked_by: string[]
  comments_count: number
  shares: number
  created_at: string
}

export interface MyCommunityPost {
  id: string
  title: string
  description: string
  images: string[]
  category: string
  author_id: string
  author_name: string
  likes: number
  comments_count: number
  created_at: string
  status: 'published' | 'draft' | 'deleted'
}

export interface CommunityPostsPage {
  status: string
  page: number
  page_size: number
  total: number
  posts: CommunityPost[]
}

export async function getCommunityPosts(
  page = 1,
  pageSize = 12,
  category = 'All',
  search = ''
): Promise<CommunityPostsPage> {
  const response = await api.get<CommunityPostsPage>('/community/posts', {
    params: { page, page_size: pageSize, category, search },
  })
  return response.data
}

export async function getMyCommunityPosts(page = 1, pageSize = 10): Promise<{ status: string; posts: MyCommunityPost[]; total: number; page: number; page_size: number }> {
  const response = await api.get<{ status: string; posts: MyCommunityPost[]; total: number; page: number; page_size: number }>(
    '/community/posts/me',
    { params: { page, page_size: pageSize } }
  )
  return response.data
}

export interface FeaturedPosts {
  status: string
  top: CommunityPost[]
  trending: CommunityPost[]
  showcase: CommunityPost[]
  tips: CommunityPost[]
}

export async function getFeaturedPosts(limit = 6): Promise<FeaturedPosts> {
  const response = await api.get<FeaturedPosts>('/community/posts/featured', {
    params: { limit },
  })
  return response.data
}

export interface MostLikedResponse {
  status: string
  posts: CommunityPost[]
}

export async function getMostLikedPosts(limit = 7): Promise<MostLikedResponse> {
  const response = await api.get<MostLikedResponse>('/community/posts/top/liked', {
    params: { limit },
  })
  return response.data
}

export async function getPostsByCategory(category: string, limit = 7): Promise<MostLikedResponse> {
  const response = await api.get<MostLikedResponse>(`/community/posts/by-category/${encodeURIComponent(category)}`, {
    params: { limit },
  })
  return response.data
}

export interface CommunityStats {
  status: string
  total_users: number
  total_posts: number
  total_comments: number
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const response = await api.get<CommunityStats>('/community/stats')
  return response.data
}

export async function createCommunityPost(
  title: string,
  description: string,
  category: string,
  images: File[]
): Promise<{ status: string; post: CommunityPost }> {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('description', description)
  formData.append('category', category)
  images.forEach((img) => formData.append('images', img))
  
  const response = await api.post<{ status: string; post: CommunityPost }>('/community/posts', formData)
  return response.data
}

export async function toggleLikePost(postId: string): Promise<{ status: string; liked: boolean; likes: number }> {
  const response = await api.post<{ status: string; liked: boolean; likes: number }>(`/community/posts/${postId}/like`)
  return response.data
}

export async function deleteCommunityPost(postId: string): Promise<{ status: string; message: string }> {
  const response = await api.delete<{ status: string; message: string }>(`/community/posts/${postId}`)
  return response.data
}

export async function editCommunityPost(
  postId: string,
  title: string,
  description: string,
  category: string
): Promise<{ status: string; post: Partial<CommunityPost> }> {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('description', description)
  formData.append('category', category)
  
  const response = await api.put<{ status: string; post: Partial<CommunityPost> }>(`/community/posts/${postId}`, formData)
  return response.data
}

export interface CommunityComment {
  id: string
  post_id: string
  author_id: string
  author_name: string
  text: string
  created_at: string
}

export interface CommunityPostDetail {
  status: string
  post: CommunityPost
  comments: CommunityComment[]
}

export async function getCommunityPost(postId: string): Promise<CommunityPostDetail> {
  const response = await api.get<CommunityPostDetail>(`/community/posts/${postId}`)
  return response.data
}

export async function addComment(postId: string, text: string): Promise<{ status: string; comment: CommunityComment }> {
  const formData = new FormData()
  formData.append('text', text)
  const response = await api.post<{ status: string; comment: CommunityComment }>(`/community/posts/${postId}/comments`, formData)
  return response.data
}

export async function deleteComment(commentId: string): Promise<{ status: string; message: string }> {
  const response = await api.delete<{ status: string; message: string }>(`/community/comments/${commentId}`)
  return response.data
}

// --- Admin Users Management ---
export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'seller' | 'user'
  status: 'active' | 'inactive'
  avatar: string
  joined_at: string
  orders_count: number
  products_count: number
  deactivation_reason: string
}

export interface AdminUserDetail extends AdminUser {
  deactivated_at: string
  reactivated_at: string
  scans_count: number
}

export interface AdminUsersStats {
  total: number
  admins: number
  sellers: number
  users: number
  active: number
  inactive: number
}

export async function getAdminUsers(
  page = 1,
  pageSize = 20,
  role = 'all',
  status = 'all',
  search = ''
): Promise<{ status: string; page: number; page_size: number; total: number; users: AdminUser[] }> {
  const response = await api.get('/admin/users', {
    params: { page, page_size: pageSize, role, status, search },
  })
  return response.data
}

export async function getAdminUsersStats(): Promise<{ status: string; stats: AdminUsersStats }> {
  const response = await api.get('/admin/users/stats')
  return response.data
}

export async function toggleUserStatus(userId: string, reason: string): Promise<{ status: string; new_status: string; message: string }> {
  const response = await api.put(`/admin/users/${userId}/toggle-status`, { reason })
  return response.data
}

export async function getAdminUserDetail(userId: string): Promise<{ status: string; user: AdminUserDetail }> {
  const response = await api.get(`/admin/users/${userId}`)
  return response.data
}

// --- Admin User Analytics (New Dashboard) ---

export interface AdminUserKpis {
  total_users: number
  active_users: number
  verified_sellers: number
  disabled_users: number
  total_change: number
  active_change: number
  sellers_change: number
  disabled_change: number
}

export interface AdminUserChartPoint {
  period: string
  'New Users': number
  'New Sellers': number
  'New Admins': number
}

export interface AdminUserCalendarDay {
  day: number | null
  count: number
}

export interface AdminUserCalendarResponse {
  status: string
  year: number
  month: number
  month_name: string
  weeks: AdminUserCalendarDay[][]
  max_count: number
}

export interface AdminUserSegmentation {
  total: number
  roles: Record<string, number>
  statuses: Record<string, number>
}

export async function getAdminUserKpis(): Promise<{ status: string; kpis: AdminUserKpis }> {
  const response = await api.get('/admin/analytics/users/kpis')
  return response.data
}

export async function getAdminUserChart(params: {
  granularity?: string
  days?: number
  start_date?: string
  end_date?: string
}): Promise<{ status: string; data: AdminUserChartPoint[] }> {
  const response = await api.get('/admin/analytics/users/chart', { params })
  return response.data
}

export async function getAdminUserCalendar(year?: number, month?: number): Promise<AdminUserCalendarResponse> {
  const response = await api.get('/admin/analytics/users/calendar', { params: { year, month } })
  return response.data
}

export async function getAdminUserSegmentation(): Promise<{ status: string } & AdminUserSegmentation> {
  const response = await api.get('/admin/analytics/users/segmentation')
  return response.data
}

// --- Admin Market Analytics ---

export interface AdminMarketKpis {
  total_revenue: number
  total_sales: number
  total_orders: number
  delivered_orders: number
  pending_orders: number
  cancelled_orders: number
  avg_order_value: number
  total_products: number
  active_products: number
  total_stock: number
  out_of_stock: number
  total_sellers: number
  active_sellers: number
  revenue_change: number
  orders_change: number
}

export interface AdminMarketChartPoint {
  period: string
  Orders: number
  Revenue: number
}

export interface AdminMarketSegmentation {
  total_orders: number
  order_statuses: Record<string, number>
  category_breakdown: Record<string, number>
  top_sellers: { seller_id: string; seller_name: string; order_count: number; revenue: number }[]
}

export interface AdminMarketProduct {
  id: string
  name: string
  seller_id: string
  seller_name: string
  category_name: string
  price: number
  stock_qty: number
  sold_count: number
  status: string
  created_at: string
}

export interface AdminMarketTableResponse {
  status: string
  products: AdminMarketProduct[]
  total: number
  page: number
  page_size: number
  sellers: { id: string; name: string }[]
  categories: string[]
}

export async function getAdminMarketKpis(): Promise<{ status: string; kpis: AdminMarketKpis }> {
  const response = await api.get('/admin/analytics/market/kpis')
  return response.data
}

export async function getAdminMarketChart(params: {
  granularity?: string
  days?: number
  start_date?: string
  end_date?: string
  seller_id?: string
}): Promise<{ status: string; data: AdminMarketChartPoint[] }> {
  const response = await api.get('/admin/analytics/market/chart', { params })
  return response.data
}

export async function getAdminMarketSegmentation(): Promise<{ status: string } & AdminMarketSegmentation> {
  const response = await api.get('/admin/analytics/market/segmentation')
  return response.data
}

export async function getAdminMarketTable(params: {
  page?: number
  page_size?: number
  seller_id?: string
  category?: string
  status?: string
  min_price?: number
  max_price?: number
  search?: string
}): Promise<AdminMarketTableResponse> {
  const response = await api.get('/admin/analytics/market/table', { params })
  return response.data
}

// --- Admin Community Posts Management ---

export interface AdminPost {
  id: string
  title: string
  description: string
  images: string[]
  category: string
  author_id: string
  author_name: string
  author_avatar: string
  likes: number
  comments_count: number
  status: 'active' | 'deleted' | 'disabled'
  created_at: string
  updated_at: string
  disable_reason: string
}

export interface AdminPostsStats {
  total_posts: number
  active_posts: number
  deleted_posts: number
  disabled_posts: number
  total_comments: number
  active_comments: number
  deleted_comments: number
  disabled_comments: number
}

export interface AdminComment {
  id: string
  post_id: string
  author_id: string
  author_name: string
  text: string
  status: 'active' | 'deleted' | 'disabled'
  created_at: string
  deleted_at: string
  disable_reason: string
}

export interface AdminPostDetail {
  id: string
  title: string
  description: string
  images: string[]
  category: string
  author_id: string
  author_name: string
  author_avatar: string
  likes: number
  status: 'active' | 'deleted' | 'disabled'
  created_at: string
  disable_reason: string
}

export async function getAdminPosts(
  page = 1,
  pageSize = 20,
  status = 'all',
  search = '',
  category = 'all'
): Promise<{ status: string; page: number; page_size: number; total: number; posts: AdminPost[] }> {
  const response = await api.get('/admin/posts', {
    params: { page, page_size: pageSize, status, search, category },
  })
  return response.data
}

export async function getAdminPostsStats(): Promise<{ status: string; stats: AdminPostsStats }> {
  const response = await api.get('/admin/posts/stats')
  return response.data
}

export async function togglePostStatus(postId: string, reason: string): Promise<{ status: string; new_status: string; message: string }> {
  const response = await api.put(`/admin/posts/${postId}/toggle-status`, { reason })
  return response.data
}

export async function getAdminPostComments(postId: string): Promise<{ status: string; post: AdminPostDetail; comments: AdminComment[]; total_comments: number }> {
  const response = await api.get(`/admin/posts/${postId}/comments`)
  return response.data
}

export async function toggleCommentStatus(commentId: string, reason: string): Promise<{ status: string; new_status: string; message: string }> {
  const response = await api.put(`/admin/comments/${commentId}/toggle-status`, { reason })
  return response.data
}

// --- Catalog Product Detail ---
export async function getCatalogProductDetail(productId: string): Promise<{ status: string; product: SellerProduct }> {
  const response = await api.get<{ status: string; product: SellerProduct }>(`/catalog/products/${productId}`)
  return response.data
}

// --- Wishlist ---
export async function getWishlist(): Promise<{ status: string; products: SellerProduct[]; total: number }> {
  const response = await api.get<{ status: string; products: SellerProduct[]; total: number }>('/wishlist')
  return response.data
}

export async function toggleWishlist(productId: string): Promise<{ status: string; in_wishlist: boolean; message: string }> {
  const response = await api.post<{ status: string; in_wishlist: boolean; message: string }>(`/wishlist/${productId}`)
  return response.data
}

export async function checkWishlist(productId: string): Promise<{ status: string; in_wishlist: boolean }> {
  const response = await api.get<{ status: string; in_wishlist: boolean }>(`/wishlist/check/${productId}`)
  return response.data
}

export async function getWishlistIds(): Promise<{ status: string; product_ids: string[] }> {
  const response = await api.get<{ status: string; product_ids: string[] }>('/wishlist/ids')
  return response.data
}

// Seller Analytics
export interface SellerKPIs {
  total_products: number
  total_orders: number
  total_earnings: number
  average_rating: number
  products_change: number
  orders_change: number
  earnings_change: number
  rating_change: number
}

export interface SellerReview {
  id: string
  user_name: string
  rating: number
  comment: string
  product_name: string
  created_at: string
}

export interface RecentOrder {
  id: string
  order_number: string
  customer: string
  total: number
  status: string
  created_at: string
  items_count?: number
}

export interface TopProduct {
  id: string
  name: string
  sold: number
  price: number
  stock: number
  category_name?: string
}

export interface SalesCategory {
  category: string
  sold: number
  percentage: number
}

export async function getSellerKPIs(): Promise<{ status: string; kpis: SellerKPIs }> {
  const response = await api.get<{ status: string; kpis: SellerKPIs }>('/seller/analytics/kpis')
  return response.data
}

export async function getSellerRecentOrders(limit = 3): Promise<{ status: string; orders: RecentOrder[] }> {
  const response = await api.get<{ status: string; orders: RecentOrder[] }>(
    '/seller/analytics/orders/recent',
    { params: { limit } }
  )
  return response.data
}

export async function getSellerTopProducts(page = 1, pageSize = 4): Promise<{ status: string; products: TopProduct[]; total: number; page: number; page_size: number }> {
  const response = await api.get<{ status: string; products: TopProduct[]; total: number; page: number; page_size: number }>(
    '/seller/analytics/products/top',
    { params: { page, page_size: pageSize } }
  )
  return response.data
}

export async function getSellerSalesCategories(): Promise<{ status: string; categories: SalesCategory[] }> {
  const response = await api.get<{ status: string; categories: SalesCategory[] }>('/seller/analytics/sales/categories')
  return response.data
}

export interface SellerStoreDetails {
  store: {
    total_stock: number
    overall_rating: number
    total_reviews: number
    max_stock_reference: number
  }
  orders: {
    total_sales: number
    avg_sales: number
    avg_orders: number
    max_sales_reference: number
  }
}

export async function getSellerStoreDetails(): Promise<{ status: string } & SellerStoreDetails> {
  const response = await api.get<{ status: string } & SellerStoreDetails>('/seller/analytics/store/details')
  return response.data
}

export interface SalesOverviewData {
  period: string
  amount: number
}

export interface SalesOverviewResponse {
  status: string
  year: number
  half: number | null
  available_years: number[]
  data: SalesOverviewData[]
  total_orders?: number
}

export async function getSellerSalesOverview(params?: {
  granularity?: 'daily' | 'monthly' | 'yearly'
  year?: number
  half?: number
  days?: number
  count?: number
  start_date?: string
  end_date?: string
}): Promise<SalesOverviewResponse> {
  const response = await api.get<SalesOverviewResponse>(
    '/seller/analytics/sales/overview',
    { params }
  )
  return response.data
}

export async function getSellerRecentReviews(limit = 5): Promise<{ status: string; reviews: SellerReview[] }> {
  const response = await api.get<{ status: string; reviews: SellerReview[] }>(
    '/seller/analytics/reviews/recent',
    { params: { limit } }
  )
  return response.data
}

// --- Admin Orders Management ---
export interface AdminOrder {
  id: string
  order_number: string
  buyer_name: string
  buyer_id: string
  seller_name: string
  seller_id: string
  category: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  total_items: number
  created_at: string
  updated_at: string
}

export interface AdminOrderDetail extends AdminOrder {
  items: OrderItem[]
  address: OrderAddress
  payment_method: string
}

export interface AdminOrdersStats {
  total_orders: number
  pending_orders: number
  confirmed_orders: number
  shipped_orders: number
  delivered_orders: number
  cancelled_orders: number
  total_revenue: number
  total_sales: number
  avg_order_value: number
}

export interface OrdersByTimeDay {
  day: number | null
  count: number
  total: number
}

export interface OrdersByTimeResponse {
  status: string
  year: number
  month: number
  month_name: string
  weeks: OrdersByTimeDay[][]
  max_count: number
}

export async function getAdminOrdersByTime(year?: number, month?: number): Promise<OrdersByTimeResponse> {
  const response = await api.get<OrdersByTimeResponse>('/admin/orders/by-time', {
    params: { year, month },
  })
  return response.data
}

export async function getAdminOrders(
  page = 1,
  pageSize = 20,
  status = 'all',
  seller = 'all',
  category = 'all',
  search = ''
): Promise<{ status: string; page: number; page_size: number; total: number; orders: AdminOrder[] }> {
  const response = await api.get('/admin/orders', {
    params: { page, page_size: pageSize, status, seller, category, search },
  })
  return response.data
}

export async function getAdminOrdersStats(): Promise<{ status: string; stats: AdminOrdersStats }> {
  const response = await api.get('/admin/orders/stats')
  return response.data
}

export async function getAdminOrderDetail(orderId: string): Promise<{ status: string; order: AdminOrderDetail }> {
  const response = await api.get(`/admin/orders/${orderId}`)
  return response.data
}

export async function updateAdminOrderStatus(orderId: string, status: string): Promise<{ status: string; new_status: string; message: string }> {
  const response = await api.put(`/admin/orders/${orderId}/status`, { status })
  return response.data
}

// ===== VOUCHER/DISCOUNT ENDPOINTS =====

export async function listVouchers(filterStatus = 'all', sellerId?: string): Promise<{ status: string; vouchers: any[] }> {
  const response = await api.get('/api/vouchers', {
    params: { filter_by: filterStatus, seller_id: sellerId },
  })
  return response.data
}

export async function getVoucher(voucherId: string): Promise<{ status: string; voucher: any }> {
  const response = await api.get(`/api/vouchers/${voucherId}`)
  return response.data
}

export async function createVoucher(data: {
  code: string
  discount_type: 'fixed' | 'percentage'
  value: number
  expiration_date?: string | null
  max_uses?: number | null
  per_user_limit?: number | null
  min_order_amount?: number | null
}): Promise<{ status: string; voucher: any }> {
  const response = await api.post('/api/vouchers', data)
  return response.data
}

export async function updateVoucher(voucherId: string, data: Partial<{
  code: string
  discount_type: 'fixed' | 'percentage'
  value: number
  expiration_date?: string | null
  max_uses?: number | null
  per_user_limit?: number | null
  min_order_amount?: number | null
  active: boolean
}>): Promise<{ status: string; voucher: any }> {
  const response = await api.put(`/api/vouchers/${voucherId}`, data)
  return response.data
}

export async function deleteVoucher(voucherId: string): Promise<{ status: string; message: string }> {
  const response = await api.delete(`/api/vouchers/${voucherId}`)
  return response.data
}

export async function validateVoucher(code: string, orderTotal: number): Promise<{
  status: string
  valid: boolean
  discount_value: number
  discount_type: 'fixed' | 'percentage'
  voucher_id: string
}> {
  const response = await api.post('/api/vouchers/validate', { code, order_total: orderTotal })
  return response.data
}

export default api

