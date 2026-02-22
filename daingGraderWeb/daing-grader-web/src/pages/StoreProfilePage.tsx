import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Store,
  Package,
  ShoppingCart,
  Star,
  Heart,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  Filter,
  X,
} from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import {
  getSellerStoreProfile,
  getCatalogProducts,
  getCatalogCategories,
  getWishlistIds,
  toggleWishlist,
  type SellerProfile,
  type SellerProduct,
  type ProductCategory,
} from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function StoreProfilePage() {
  const { sellerId } = useParams<{ sellerId: string }>()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { showToast } = useToast()
  const role = user?.role ?? 'user'

  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [wishlistIds, setWishlistIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState<'latest' | 'most_sold' | 'price_low' | 'price_high'>('latest')
  const pageSize = 12

  // Load seller profile
  useEffect(() => {
    if (!sellerId) return
    const loadSeller = async () => {
      setLoading(true)
      try {
        const res = await getSellerStoreProfile(sellerId)
        setSeller(res.seller)
      } catch (err) {
        console.error('Failed to load seller:', err)
        showToast('Failed to load store profile')
      } finally {
        setLoading(false)
      }
    }
    loadSeller()
  }, [sellerId])

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true)
      try {
        const res = await getCatalogCategories()
        setCategories(res.categories || [])
      } catch (err) {
        console.error('Failed to load categories:', err)
      } finally {
        setLoadingCategories(false)
      }
    }
    loadCategories()
  }, [])

  // Load seller products with filters
  useEffect(() => {
    if (!sellerId) return
    const loadProducts = async () => {
      setLoadingProducts(true)
      try {
        const res = await getCatalogProducts({
          seller_id: sellerId,
          search: searchQuery || undefined,
          category_id: selectedCategory || undefined,
          page,
          page_size: pageSize,
          sort: sortBy,
        })
        setProducts(res.products || [])
        setTotal(res.total || 0)
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoadingProducts(false)
      }
    }
    loadProducts()
  }, [sellerId, page, searchQuery, selectedCategory, sortBy])

  // Load wishlist
  useEffect(() => {
    if (!isLoggedIn || role !== 'user') {
      setWishlistIds([])
      return
    }
    const loadWishlist = async () => {
      try {
        const res = await getWishlistIds()
        setWishlistIds(res.product_ids || [])
      } catch (err) {
        console.error('Failed to load wishlist:', err)
      }
    }
    loadWishlist()
  }, [isLoggedIn, role])

  const handleToggleWishlist = async (productId: string) => {
    if (!isLoggedIn) {
      showToast('Please login to add items to wishlist')
      navigate('/login')
      return
    }
    if (role !== 'user') {
      showToast('Only customers can add items to wishlist')
      return
    }
    try {
      const res = await toggleWishlist(productId)
      if (res.in_wishlist) {
        setWishlistIds((prev) => [...prev, productId])
      } else {
        setWishlistIds((prev) => prev.filter((id) => id !== productId))
      }
      showToast(res.message)
    } catch (err) {
      showToast('Failed to update wishlist')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSortBy('latest')
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize)

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          Loading store...
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Store Not Found</h2>
          <p className="text-slate-500 mb-4">This store doesn't exist or has no products.</p>
          <Link
            to="/sellers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Stores
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen">
      <PageTitleHero
        title="Store Profile"
        subtitle="Browse products and learn more about this seller."
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Store Header Info - Overlays the hero */}
        <div className="relative -mt-20 mb-6 bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-xl shadow-md p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                {seller?.avatar_url ? (
                  <img src={seller.avatar_url} alt={seller.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-12 h-12 text-blue-600" />
                )}
              </div>
            </div>

            {/* Store Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{seller?.name}</h1>
              <p className="text-slate-600 text-sm mb-3">{seller?.bio || 'Welcome to our store'}</p>
              
              {/* Stats Row */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Online Store</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>
                    Joined {seller?.joined_at ? new Date(seller.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl shadow-md px-4 py-3 text-center min-w-[110px]">
                <div className="text-2xl font-bold text-blue-600">{seller?.product_count}</div>
                <div className="text-xs text-slate-600 mt-1">Products</div>
              </div>
              <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl shadow-md px-4 py-3 text-center min-w-[110px]">
                <div className="text-2xl font-bold text-blue-600">{seller?.total_sold.toLocaleString()}</div>
                <div className="text-xs text-slate-600 mt-1">Sold</div>
              </div>
              {seller?.avg_rating && (
                <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-xl shadow-md px-4 py-3 text-center min-w-[110px]">
                  <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                    {seller.avg_rating}
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{seller.total_reviews} reviews</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs and Controls */}
        <div className="mb-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-300 overflow-x-auto">
            <button className="px-4 py-3 font-medium text-slate-900 border-b-2 border-blue-600 text-sm whitespace-nowrap">
              Seller Products
            </button>
            <button className="px-4 py-3 font-medium text-slate-600 hover:text-slate-900 text-sm whitespace-nowrap">
              Feedbacks
            </button>
            <button className="px-4 py-3 font-medium text-slate-600 hover:text-slate-900 text-sm whitespace-nowrap">
              Policy
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-xl shadow-md p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Filters</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    setPage(1)
                  }}
                  disabled={loadingCategories}
                  className="w-full px-3 py-2 border border-slate-300 bg-white text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'latest' | 'most_sold' | 'price_low' | 'price_high')
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-slate-300 bg-white text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="latest">Date: Newest</option>
                  <option value="most_sold">Most Sold</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-slate-600 border border-slate-300 bg-white hover:bg-slate-100 text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loadingProducts ? (
          <div className="text-center py-12 text-slate-500">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>This store has no products yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {products.map((product) => {
                const hasImages = product.images && product.images.length > 0
                const mainImage = hasImages ? product.images[product.main_image_index || 0]?.url : null
                const inWishlist = wishlistIds.includes(product.id)

                return (
                  <Link
                    key={product.id}
                    to={`/catalog/${product.id}`}
                    className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 overflow-hidden group hover:shadow-lg hover:border-blue-400 transition-all duration-200 rounded-xl shadow-md"
                  >
                    {/* Wishlist button */}
                    {isLoggedIn && role === 'user' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleWishlist(product.id)
                        }}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-white/95 rounded-full border border-slate-200 hover:bg-white transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                      </button>
                    )}

                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50">
                          <Package className="w-12 h-12 text-blue-300" />
                        </div>
                      )}
                      {product.category_name && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-medium uppercase rounded">
                            {product.category_name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-2">{product.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-600">₱{product.price.toLocaleString()}</span>
                        <span className="text-xs text-slate-500">{product.stock_qty} left</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
