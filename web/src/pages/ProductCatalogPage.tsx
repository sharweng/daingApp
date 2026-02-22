import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Heart,
  Star,
  ShoppingCart,
  Filter,
  ArrowUp,
  Store,
  Package,
  Tag,
} from 'lucide-react'
import {
  getCatalogCategories,
  getCatalogSellers,
  getCatalogProducts,
  getWishlistIds,
  toggleWishlist,
  type ProductCategory,
  type CatalogSeller,
  type SellerProduct,
} from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import PageTitleHero from '../components/layout/PageTitleHero'

// Netflix-style Product Carousel Component
function ProductCarousel({
  title,
  icon: Icon,
  products,
  onProductClick,
  wishlistIds,
  onToggleWishlist,
  isLoggedIn,
  userId,
  userRole,
}: {
  title: string
  icon: React.ElementType
  products: SellerProduct[]
  onProductClick: (productId: string) => void
  wishlistIds: string[]
  onToggleWishlist: (productId: string) => void
  isLoggedIn: boolean
  userId?: string
  userRole?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) el.addEventListener('scroll', checkScroll)
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll)
    }
  }, [products])

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const cardWidth = 220
    scrollRef.current.scrollBy({ left: dir === 'left' ? -cardWidth * 2 : cardWidth * 2, behavior: 'smooth' })
  }

  return (
    <div className="relative group/carousel">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      {products.length === 0 ? (
        <div className="flex items-center justify-center py-8 bg-blue-50 border border-dashed border-blue-300 rounded-lg">
          <p className="text-sm text-blue-600">No products available</p>
        </div>
      ) : (
        <>
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 mt-3 -translate-y-1/2 z-10 w-10 h-24 bg-blue-600/70 hover:bg-blue-700 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 rounded-l"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 mt-3 -translate-y-1/2 z-10 w-10 h-24 bg-blue-600/70 hover:bg-blue-700 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 rounded-r"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {products.map((product) => {
              const hasImages = product.images && product.images.length > 0
              const mainImage = hasImages ? product.images[product.main_image_index || 0]?.url : null
              const inWishlist = wishlistIds.includes(product.id)
              const isMyProduct = userRole === 'seller' && userId && product.seller_id === userId

              return (
                <div
                  key={product.id}
                  onClick={() => onProductClick(product.id)}
                  className="flex-shrink-0 w-[200px] rounded-md overflow-hidden cursor-pointer group hover:scale-105 hover:z-10 transition-transform duration-200 relative border border-blue-200 bg-white"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                    {mainImage ? (
                      <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <Package className="w-10 h-10 text-blue-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <h4 className="font-bold text-white text-sm line-clamp-2 drop-shadow-lg">{product.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-white/80 text-xs">
                        <span className="font-semibold text-blue-300">₱{product.price.toLocaleString()}</span>
                      </div>
                    </div>

                    {product.category_name && (
                      <div className="absolute top-2 left-2">
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-medium uppercase rounded">
                          {product.category_name}
                        </span>
                      </div>
                    )}

                    {isMyProduct && (
                      <div className="absolute top-2 right-2">
                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-semibold uppercase rounded">
                          My Product
                        </span>
                      </div>
                    )}

                    {isLoggedIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleWishlist(product.id)
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function ProductCatalogPage() {
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { showToast } = useToast()

  // Filter options
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [sellers, setSellers] = useState<CatalogSeller[]>([])
  const [loadingFilters, setLoadingFilters] = useState(true)

  // Filter state
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSeller, setSelectedSeller] = useState('')
  const [sortBy, setSortBy] = useState<'latest' | 'most_sold' | 'price_low' | 'price_high'>('latest')

  // Products state
  const [latestProducts, setLatestProducts] = useState<SellerProduct[]>([])
  const [mostSoldProducts, setMostSoldProducts] = useState<SellerProduct[]>([])
  const [allProducts, setAllProducts] = useState<SellerProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCarousels, setLoadingCarousels] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 12

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>([])

  // Load filter options
  useEffect(() => {
    const loadFilters = async () => {
      setLoadingFilters(true)
      try {
        const [catsRes, sellersRes] = await Promise.all([getCatalogCategories(), getCatalogSellers()])
        setCategories(catsRes.categories || [])
        setSellers(sellersRes.sellers || [])
      } catch (err) {
        console.error('Failed to load filters:', err)
      } finally {
        setLoadingFilters(false)
      }
    }
    loadFilters()
  }, [])

  // Load carousels
  useEffect(() => {
    const loadCarousels = async () => {
      setLoadingCarousels(true)
      try {
        const [latestRes, mostSoldRes] = await Promise.all([
          getCatalogProducts({ sort: 'latest', page_size: 7 }),
          getCatalogProducts({ sort: 'most_sold', page_size: 7 }),
        ])
        setLatestProducts(latestRes.products || [])
        setMostSoldProducts(mostSoldRes.products || [])
      } catch (err) {
        console.error('Failed to load carousels:', err)
      } finally {
        setLoadingCarousels(false)
      }
    }
    loadCarousels()
  }, [])

  // Load wishlist IDs
  useEffect(() => {
    if (!isLoggedIn) {
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
  }, [isLoggedIn])

  // Load products with filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      loadProducts(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, selectedCategory, selectedSeller, sortBy])

  useEffect(() => {
    loadProducts(page)
  }, [page])

  const loadProducts = async (pageNum: number) => {
    setLoading(true)
    try {
      const res = await getCatalogProducts({
        search: search || undefined,
        category_id: selectedCategory || undefined,
        seller_id: selectedSeller || undefined,
        sort: sortBy,
        page: pageNum,
        page_size: pageSize,
      })
      setAllProducts(res.products || [])
      setTotal(res.total || 0)
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProductClick = (productId: string) => {
    navigate(`/catalog/${productId}`)
  }

  const handleToggleWishlist = async (productId: string) => {
    if (!isLoggedIn) {
      showToast('Please login to add items to wishlist')
      navigate('/login')
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
    setSearch('')
    setSelectedCategory('')
    setSelectedSeller('')
    setSortBy('latest')
    setPage(1)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Page Hero Header */}
      <PageTitleHero
        title="Shop Fresh Daings"
        subtitle="Discover premium quality dried fish from trusted local sellers. Fresh, authentic, and delivered right to your doorstep."
        backgroundImage="/assets/daing/danggit/slide1.jfif"
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-blue-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          disabled={loadingFilters}
          className="px-3 py-2 border border-blue-300 bg-white text-sm min-w-[140px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded disabled:opacity-50"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={selectedSeller}
          onChange={(e) => setSelectedSeller(e.target.value)}
          disabled={loadingFilters}
          className="px-3 py-2 border border-blue-300 bg-white text-sm min-w-[160px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded disabled:opacity-50"
        >
          <option value="">All Sellers</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'latest' | 'most_sold' | 'price_low' | 'price_high')}
          className="px-3 py-2 border border-blue-300 bg-white text-sm min-w-[140px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
        >
          <option value="latest">Date: Newest</option>
          <option value="most_sold">Most Sold</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>

        <button
          onClick={clearFilters}
          className="px-4 py-2 text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 text-sm rounded transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Horizontal Carousels Section */}
      {loadingCarousels ? (
        <div className="text-center py-8 text-slate-500">Loading products...</div>
      ) : (
        <div className="space-y-6">
          <ProductCarousel
            title="Latest Products"
            icon={Clock}
            products={latestProducts}
            onProductClick={handleProductClick}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            isLoggedIn={isLoggedIn}
            userId={user?.id}
            userRole={user?.role}
          />

          <ProductCarousel
            title="Most Sold"
            icon={TrendingUp}
            products={mostSoldProducts}
            onProductClick={handleProductClick}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            isLoggedIn={isLoggedIn}
            userId={user?.id}
            userRole={user?.role}
          />
        </div>
      )}

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-6 items-start">
        {/* LEFT SIDEBAR */}
        <div className="hidden lg:block sticky top-24">
          <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 p-4 shadow-lg hover:shadow-xl transition-shadow rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Filters</h3>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 border border-blue-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Category</label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedCategory === ''
                      ? 'bg-blue-50 text-blue-600 font-medium border-l-2 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-blue-50 text-blue-600 font-medium border-l-2 border-blue-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={scrollToTop}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors rounded"
            >
              <ArrowUp className="w-4 h-4" />
              Back to Top
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">All Products</h2>
            <span className="text-sm text-slate-500">
              {loading ? 'Loading...' : `${total} products found`}
            </span>
          </div>
          {!isLoggedIn && (
            <div className="text-sm text-slate-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              Login to buy, wishlist, and review products.{' '}
              <Link to="/login" className="text-blue-700 font-semibold hover:underline">Login</Link>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              Loading products...
            </div>
          ) : allProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p>No products found matching your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allProducts.map((product) => {
                  const hasImages = product.images && product.images.length > 0
                  const mainImage = hasImages ? product.images[product.main_image_index || 0]?.url : null
                  const inWishlist = wishlistIds.includes(product.id)
                  const isMyProduct = user?.role === 'seller' && user?.id && product.seller_id === user.id

                  return (
                    <div
                      key={product.id}
                      className="bg-white border border-blue-200 overflow-hidden group relative cursor-pointer shadow-md hover:shadow-lg hover:border-blue-400 transition-all duration-200 rounded-lg"
                      onClick={() => navigate(`/catalog/${product.id}`)}
                    >
                      {/* Wishlist button */}
                      {isLoggedIn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleWishlist(product.id)
                          }}
                          className="absolute top-2 right-2 z-10 p-2 bg-white/90 rounded-full border border-slate-200 hover:bg-white transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                        </button>
                      )}

                      <div className="relative aspect-[4/3] overflow-hidden bg-blue-50">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-blue-300" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                          <div className="flex items-center gap-4 text-white text-xs">
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="w-3.5 h-3.5" /> {product.sold_count || 0}
                            </span>
                          </div>
                        </div>
                        {product.category_name && (
                          <div className="absolute top-2 left-2">
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-medium uppercase rounded">
                              {product.category_name}
                            </span>
                          </div>
                        )}
                        {isMyProduct && (
                          <div className="absolute top-2 right-2">
                            <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-semibold uppercase rounded">
                              My Product
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-gradient-to-b from-white to-blue-50">
                        <h3 className="font-bold text-slate-900 text-base line-clamp-2 mb-1">{product.name}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/store/${product.seller_id}`)
                          }}
                          className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors bg-transparent border-0 p-0 hover:underline font-normal cursor-pointer"
                        >
                          <Store className="w-3 h-3" />
                          <span>{product.seller_name}</span>
                        </button>

                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-blue-600 text-lg">₱{product.price.toLocaleString()}</span>
                          <span className="text-xs text-slate-400">{product.stock_qty} in stock</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="hidden lg:block sticky top-24">
          <div className="space-y-4">
            {/* Top Sellers */}
            <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 p-4 shadow-lg hover:shadow-xl transition-shadow rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Top Sellers</h3>
              </div>
              <div className="space-y-3">
                {sellers.slice(0, 5).map((seller, idx) => (
                  <div
                    key={seller.id}
                    onClick={() => setSelectedSeller(seller.id)}
                    className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-2 -mx-2 transition-colors rounded"
                  >
                    <span className="text-lg font-bold text-slate-300">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{seller.name}</p>
                    </div>
                  </div>
                ))}
                {sellers.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">No sellers available</p>
                )}
              </div>
            </div>

            {/* Shop Stats */}
            <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 p-4 shadow-lg hover:shadow-xl transition-shadow rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Shop Stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Total Products</span>
                  </div>
                  <span className="font-semibold text-slate-900">{total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Active Sellers</span>
                  </div>
                  <span className="font-semibold text-slate-900">{sellers.length}</span>
                </div>
              </div>
            </div>

            {/* Back to Top */}
            <button
              onClick={scrollToTop}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-md rounded"
            >
              <ArrowUp className="w-4 h-4" />
              Back to Top
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}