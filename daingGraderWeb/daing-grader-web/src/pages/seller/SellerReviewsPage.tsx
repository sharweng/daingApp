import React, { useEffect, useState, useMemo } from 'react'
import { Star, Package, Search, RefreshCcw, MessageSquare, User, Calendar, Filter } from 'lucide-react'
import PageTitleHero from '../../components/layout/PageTitleHero'
import { getSellerProducts, getSellerProductReviews, type SellerProduct, type ProductReview } from '../../services/api'
import { useToast } from '../../contexts/ToastContext'

const ITEMS_PER_PAGE = 5

export default function SellerReviewsPage() {
  const { showToast } = useToast()
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [starFilter, setStarFilter] = useState<number | null>(null)

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await getSellerProducts({ page: 1, page_size: 100 })
      setProducts(res.products || [])
      if (res.products.length > 0 && !selectedProduct) {
        setSelectedProduct(res.products[0])
      }
    } catch {
      showToast('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async (productId: string, page = 1) => {
    setReviewsLoading(true)
    try {
      const res = await getSellerProductReviews(productId, page, ITEMS_PER_PAGE)
      setReviews(res.reviews || [])
      setReviewsTotal(res.total || 0)
      setReviewsPage(page)
    } catch {
      showToast('Failed to load reviews')
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      loadReviews(selectedProduct.id)
    }
  }, [selectedProduct])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const query = searchQuery.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(query))
  }, [products, searchQuery])

  const filteredReviews = useMemo(() => {
    if (starFilter === null) return reviews
    return reviews.filter((r) => r.rating === starFilter)
  }, [reviews, starFilter])

  const totalPages = Math.ceil(reviewsTotal / ITEMS_PER_PAGE)

  const handleProductClick = (product: SellerProduct) => {
    setSelectedProduct(product)
    setStarFilter(null)
  }

  const handlePageChange = (page: number) => {
    if (selectedProduct) {
      loadReviews(selectedProduct.id, page)
    }
  }

  const getProductRatingStats = (product: SellerProduct) => {
    // If product has rating info, use it; otherwise show placeholder
    const avgRating = 0 // Products don't have avg rating in current schema
    const reviewCount = 0 // Products don't have review count in current schema
    return { avgRating, reviewCount }
  }

  return (
    <>
      <PageTitleHero
        title="Customer Reviews"
        subtitle="View and respond to customer feedback"
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      <div className="flex h-[calc(100vh-14rem)] gap-4 overflow-hidden px-6 py-4">
      {/* LEFT PANEL - Product List */}
      <div className="w-2/5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-blue-900">Reviews</h1>
            <p className="text-sm text-slate-600">View customer ratings and feedback.</p>
          </div>
          <button
            onClick={loadProducts}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors text-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex-1 bg-white border border-blue-200 shadow-sm overflow-hidden rounded-lg flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-blue-200 bg-gradient-to-r from-white to-blue-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700">
                <Package className="w-5 h-5" />
              </div>
              <span className="font-bold text-blue-900 text-base">Your Products</span>
              <span className="text-sm text-white bg-blue-600 px-2 py-0.5 rounded">{products.length}</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-blue-100 bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 animate-pulse text-slate-300" />
                  <p>Loading products...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{searchQuery ? 'No products found.' : 'No products yet.'}</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-blue-100">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProduct?.id === product.id
                  const mainImage = product.images[product.main_image_index]?.url || product.images[0]?.url
                  const stats = getProductRatingStats(product)

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className={`px-4 py-4 cursor-pointer transition-colors hover:bg-blue-50 ${
                        isSelected ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {mainImage && (
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded border border-slate-200"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm mb-1 truncate">{product.name}</div>
                          <div className="text-sm font-semibold text-blue-700 mb-1">
                            ₱{product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className={product.stock_qty > 0 ? 'text-green-600' : 'text-red-600'}>
                              {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of stock'}
                            </span>
                            {product.category_name && (
                              <>
                                <span>•</span>
                                <span>{product.category_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Reviews Details */}
      <div className="flex-1 flex flex-col">
        {selectedProduct ? (
          <div className="flex-1 bg-white border border-blue-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-blue-900">{selectedProduct.name}</h2>
                  <p className="text-sm text-slate-600 mt-1">Customer Reviews & Ratings</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">{reviewsTotal}</div>
                  <div className="text-xs text-slate-500">Total Reviews</div>
                </div>
              </div>
            </div>

            {/* Star Filter */}
            <div className="px-6 py-3 border-b border-blue-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Filter by rating:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setStarFilter(null)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      starFilter === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All
                  </button>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setStarFilter(rating)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                        starFilter === rating
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {rating}
                      <Star className={`w-3 h-3 ${starFilter === rating ? 'fill-white' : 'fill-yellow-400 text-yellow-400'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Reviews */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {reviewsLoading ? (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 animate-pulse text-slate-300" />
                    <p>Loading reviews...</p>
                  </div>
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>{starFilter !== null ? `No ${starFilter}-star reviews yet.` : 'No reviews yet.'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{review.user_name}</div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!reviewsLoading && filteredReviews.length > 0 && totalPages > 1 && starFilter === null && (
              <div className="px-6 py-4 border-t border-blue-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Page {reviewsPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(reviewsPage - 1)}
                      disabled={reviewsPage === 1}
                      className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(reviewsPage + 1)}
                      disabled={reviewsPage === totalPages}
                      className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-white border border-blue-200 shadow-sm rounded-lg flex items-center justify-center">
            <div className="text-center text-slate-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">Select a product</p>
              <p className="text-sm">Choose a product to view its reviews</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
