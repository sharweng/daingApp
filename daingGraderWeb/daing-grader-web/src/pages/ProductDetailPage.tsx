import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Star,
  Store,
  Package,
  ArrowLeft,
  Share2,
  Tag,
} from 'lucide-react'
import {
  getCatalogProductDetail,
  getSellerProductReviews,
  getMyProductReview,
  createProductReview,
  updateMyProductReview,
  deleteMyProductReview,
  toggleWishlist,
  checkWishlist,
  addToCart,
  type SellerProduct,
  type ProductReview,
} from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import PageTitleHero from '../components/layout/PageTitleHero'
import { validateReview, censorBadWords } from '../utils/validation'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { showToast } = useToast()

  const [product, setProduct] = useState<SellerProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewPage, setReviewPage] = useState(1)
  const [totalReviews, setTotalReviews] = useState(0)
  const reviewsPerPage = 5

  const [myReview, setMyReview] = useState<ProductReview | null>(null)
  const [canReview, setCanReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({})
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewEligibilityLoading, setReviewEligibilityLoading] = useState(false)

  const [inWishlist, setInWishlist] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)

  // Load product details
  useEffect(() => {
    if (!id) return
    const loadProduct = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getCatalogProductDetail(id)
        setProduct(res.product)
        setCurrentImageIndex(res.product.main_image_index || 0)
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } }
        if (e.response?.status === 404) {
          setError('Product not found')
        } else {
          setError('Failed to load product')
        }
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [id])

  // Load reviews
  useEffect(() => {
    if (!id) return
    const loadReviews = async () => {
      setLoadingReviews(true)
      try {
        const res = await getSellerProductReviews(id, reviewPage, reviewsPerPage)
        setReviews(res.reviews || [])
        setTotalReviews(res.total || 0)
      } catch (err) {
        console.error('Failed to load reviews:', err)
      } finally {
        setLoadingReviews(false)
      }
    }
    loadReviews()
  }, [id, reviewPage])

  useEffect(() => {
    if (!id || !isLoggedIn || user?.role !== 'user') {
      setMyReview(null)
      setCanReview(false)
      return
    }
    const loadMyReview = async () => {
      setReviewEligibilityLoading(true)
      try {
        const res = await getMyProductReview(id)
        setCanReview(res.can_review)
        setMyReview(res.review || null)
        if (res.review) {
          setReviewRating(res.review.rating)
          setReviewComment(res.review.comment)
        } else {
          setReviewRating(5)
          setReviewComment('')
        }
      } catch (err) {
        console.error('Failed to load review status:', err)
        setMyReview(null)
        setCanReview(false)
      } finally {
        setReviewEligibilityLoading(false)
      }
    }
    loadMyReview()
  }, [id, isLoggedIn, user?.role])

  // Check wishlist status
  useEffect(() => {
    if (!id || !isLoggedIn) return
    const checkStatus = async () => {
      try {
        const res = await checkWishlist(id)
        setInWishlist(res.in_wishlist)
      } catch (err) {
        console.error('Failed to check wishlist:', err)
      }
    }
    checkStatus()
  }, [id, isLoggedIn])

  const handleToggleWishlist = async () => {
    if (!isLoggedIn) {
      showToast('Please login to add items to wishlist')
      navigate('/login')
      return
    }
    // Disallow wishlist for non-user roles
    if (user && user.role && user.role !== 'user') {
      showToast('🚫 Role Access Denied — admin or seller cannot wishlist or order')
      return
    }
    if (!id || wishlistLoading) return

    setWishlistLoading(true)
    try {
      const res = await toggleWishlist(id)
      setInWishlist(res.in_wishlist)
      showToast(res.message)
    } catch (err) {
      showToast('Failed to update wishlist')
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      showToast('Please login to add items to cart')
      navigate('/login')
      return
    }
    if (user && user.role && user.role !== 'user') {
      showToast('🚫 Role Access Denied — admin or seller cannot order')
      return
    }
    if (!product) return
    if (cartLoading) return
    setCartLoading(true)
    try {
      const res = await addToCart(product.id, 1)
      showToast(res.message || 'Added to cart')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to add to cart'
      showToast(msg)
    } finally {
      setCartLoading(false)
    }
  }

  const handlePrevImage = () => {
    if (!product?.images?.length) return
    setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    if (!product?.images?.length) return
    setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))
  }

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  const totalReviewPages = Math.ceil(totalReviews / reviewsPerPage)

  const validateReviewForm = () => {
    const { valid, errors } = validateReview(reviewRating, reviewComment)
    setReviewErrors(errors)
    return valid
  }

  const handleSubmitReview = async () => {
    if (!id) return
    if (!isLoggedIn) {
      showToast('Please login to leave a review')
      navigate('/login')
      return
    }
    if (user?.role !== 'user') {
      showToast('Only customers can review products')
      return
    }
    if (!canReview) {
      showToast('You can only review products you ordered')
      return
    }
    if (reviewSubmitting || !validateReviewForm()) return

    setReviewSubmitting(true)
    try {
      // Censor bad words in review comment
      const cleanComment = censorBadWords(reviewComment.trim())
      
      if (myReview) {
        const res = await updateMyProductReview(id, {
          rating: reviewRating,
          comment: cleanComment,
        })
        setMyReview(res.review)
        showToast('Review updated')
      } else {
        const res = await createProductReview(id, {
          rating: reviewRating,
          comment: cleanComment,
        })
        setMyReview(res.review)
        showToast('Review submitted')
      }
      setReviewPage(1)
      const refreshed = await getSellerProductReviews(id, 1, reviewsPerPage)
      setReviews(refreshed.reviews || [])
      setTotalReviews(refreshed.total || 0)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to submit review'
      showToast(msg)
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!id || !myReview) return
    if (!confirm('Are you sure you want to delete your review? This action cannot be undone.')) return

    setReviewSubmitting(true)
    try {
      await deleteMyProductReview(id)
      setMyReview(null)
      setReviewRating(5)
      setReviewComment('')
      showToast('Review deleted successfully')
      
      // Refresh reviews list
      const refreshed = await getSellerProductReviews(id, 1, reviewsPerPage)
      setReviews(refreshed.reviews || [])
      setTotalReviews(refreshed.total || 0)
      setReviewPage(1)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to delete review'
      showToast(msg)
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 w-full min-h-screen">
        <div className="flex items-center justify-center py-20">
          <div className="text-xl text-slate-500">Loading product...</div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-6 w-full min-h-screen">
        <div className="text-center py-20">
          <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <div className="text-2xl text-slate-700 font-semibold mb-2">{error || 'Product not found'}</div>
          <Link to="/catalog" className="text-blue-600 hover:underline">
            ← Back to catalog
          </Link>
        </div>
      </div>
    )
  }

  const hasImages = product.images && product.images.length > 0
  const currentImage = hasImages ? product.images[currentImageIndex]?.url : null

  return (
    <div className="space-y-8 w-full min-h-screen bg-white">
      {/* Page Hero */}
      <PageTitleHero
        title={product.name}
        subtitle={`Sold by ${product.seller_name}`}
        backgroundImage={currentImage || '/assets/daing/danggit/slide1.jfif'}
      />

      {/* Container with back button and content */}
      <div className="max-w-7xl mx-auto px-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/catalog')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </button>

        {/* Product Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Image Gallery (1 col) */}
          <div className="lg:col-span-1 space-y-3">
            {/* Main Image */}
            <div className="relative aspect-square bg-slate-50 rounded-none overflow-hidden border border-slate-200">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-20 h-20 text-slate-300" />
              </div>
            )}

            {/* Image Navigation */}
            {hasImages && product.images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/90 hover:bg-slate-950 text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/90 hover:bg-slate-950 text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {hasImages && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-16 h-16 overflow-hidden border transition-all ${
                    idx === currentImageIndex ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Badge */}
          {product.category_name && (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium uppercase tracking-wide">
                {product.category_name}
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold text-slate-900 leading-tight">{product.name}</h1>
          </div>

          {/* Seller & Date */}
          <div className="flex flex-col gap-2 text-sm border-t border-b border-slate-200 py-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Store className="w-4 h-4" />
              <span>Sold by</span>
              <Link to={`/store/${product.seller_id}`} className="font-semibold text-slate-900 hover:underline">
                {product.seller_name}
              </Link>
            </div>
            {product.created_at && (
              <div className="text-slate-500">
                Listed {new Date(product.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>

          {/* Rating & Price */}
          <div className="space-y-4">
            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-600">
                {loadingReviews ? 'Loading...' : totalReviews > 0 ? `${avgRating} (${totalReviews})` : 'No reviews'}
              </span>
            </div>

            {/* Price */}
            <div className="text-5xl font-bold text-slate-900">
              ₱{product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-3 text-sm">
              <Package className="w-4 h-4 text-slate-500" />
              <span className={`font-semibold ${product.stock_qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of stock'}
              </span>
              {product.sold_count !== undefined && product.sold_count > 0 && (
                <span className="text-slate-500 ml-2">({product.sold_count} sold)</span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t border-b border-slate-200 py-4">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">Description</h3>
              <p className="text-slate-700 leading-relaxed text-sm">{product.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={Boolean(product.stock_qty <= 0 || product.is_disabled || (isLoggedIn && user && user.role !== 'user'))}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold text-sm transition-all ${
                (product.stock_qty <= 0 || product.is_disabled || Boolean(isLoggedIn && user && user.role !== 'user'))
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-950'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {product.stock_qty <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>

            <button
              onClick={handleToggleWishlist}
              disabled={wishlistLoading}
              className={`p-3 border transition-colors ${
                inWishlist
                  ? 'bg-red-50 border-red-400 text-red-600 hover:bg-red-100'
                  : 'border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600'
              }`}
              title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-600' : ''}`} />
            </button>

            <button className="p-3 border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          
          {!isLoggedIn && (
            <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2">
              <Link to="/login" className="text-slate-900 font-semibold hover:underline">Login</Link> to purchase, save to wishlist, and review this product.
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Reviews Section */}
      <section className="max-w-7xl mx-auto px-6 border-t border-slate-200 pt-8">
        <div className="flex items-center gap-2 mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Customer Reviews</h2>
          <span className="text-sm text-slate-600 font-medium">({totalReviews})</span>
        </div>

        {!isLoggedIn && (
          <div className="mb-8 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <Link to="/login" className="text-slate-900 font-semibold hover:underline">Login</Link> to write a review.
          </div>
        )}

        {isLoggedIn && user?.role === 'user' && (
          <div className="mb-8 border border-slate-200 p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">
                {myReview ? 'Update your review' : 'Share your feedback'}
              </h3>
              {myReview && (
                <span className="text-xs text-slate-500 font-medium">
                  Last updated {new Date(myReview.updated_at || myReview.created_at).toLocaleDateString('en-US')}
                </span>
              )}
            </div>
            {reviewEligibilityLoading ? (
              <div className="text-sm text-slate-500">Checking review eligibility...</div>
            ) : !canReview ? (
              <div className="text-sm text-slate-700 bg-amber-50 border border-amber-200 p-3">
                <p className="font-medium mb-1">🔒 Reviews for orders only</p>
                <p>You can review products after receiving your order.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-slate-900 mb-2">Your rating</div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(value)}
                          className="p-1 transition-transform hover:scale-110"
                          aria-label={`Rate ${value} stars`}
                        >
                          <Star
                            className={`w-5 h-5 ${value <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{reviewRating} / 5</span>
                  </div>
                  {reviewErrors.rating && (
                    <div className="text-xs text-red-600 mt-1">{reviewErrors.rating}</div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-900 mb-2">Your review</div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                    placeholder="Share your experience with this product."
                    className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  {reviewErrors.comment && (
                    <div className="text-xs text-red-600 mt-1">{reviewErrors.comment}</div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className="px-4 py-2 bg-slate-900 text-white text-sm font-bold hover:bg-slate-950 disabled:opacity-60 transition-colors"
                  >
                    {reviewSubmitting ? 'Saving...' : myReview ? 'Update review' : 'Submit review'}
                  </button>
                  {myReview && (
                    <button
                      type="button"
                      onClick={handleDeleteReview}
                      disabled={reviewSubmitting}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  <span className="text-xs text-slate-500 ml-auto">
                    {myReview ? 'You can update any time.' : 'You can edit your review later.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reviews List */}
        {loadingReviews ? (
          <div className="text-center py-12 text-slate-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>No reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-slate-200 p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                      {review.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-900 text-sm">{review.user_name}</div>
                        {isLoggedIn && user?.id && review.user_id === user.id && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-900 text-white px-2 py-0.5">
                            Your Review
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{review.comment}</p>
              </div>
            ))}

            {/* Pagination */}
            {totalReviewPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  onClick={() => setReviewPage(Math.max(1, reviewPage - 1))}
                  disabled={reviewPage === 1}
                  className="px-3 py-1 border border-slate-300 text-slate-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-slate-600 text-sm">
                  {reviewPage} of {totalReviewPages}
                </span>
                <button
                  onClick={() => setReviewPage(Math.min(totalReviewPages, reviewPage + 1))}
                  disabled={reviewPage === totalReviewPages}
                  className="px-3 py-1 border border-slate-300 text-slate-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
