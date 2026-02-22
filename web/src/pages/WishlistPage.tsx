import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Heart,
  Trash2,
  ShoppingCart,
  Star,
  Package,
  ArrowLeft,
} from 'lucide-react'
import {
  getWishlist,
  toggleWishlist,
  addToCart,
  getSellerProductReviews,
  type SellerProduct,
} from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import PageTitleHero from '../components/layout/PageTitleHero'

export default function WishlistPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()

  const [products, setProducts] = useState<SellerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [productRatings, setProductRatings] = useState<Record<string, { avg: number; count: number }>>({})
  const [cartLoadingId, setCartLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      return
    }
    loadWishlist()
  }, [isLoggedIn, navigate])

  const loadWishlist = async () => {
    setLoading(true)
    try {
      const res = await getWishlist()
      setProducts(res.products || [])
      // Load ratings for each product
      loadRatings(res.products || [])
    } catch (err) {
      console.error('Failed to load wishlist:', err)
      showToast('Failed to load wishlist')
    } finally {
      setLoading(false)
    }
  }

  const loadRatings = async (prods: SellerProduct[]) => {
    const ratings: Record<string, { avg: number; count: number }> = {}
    await Promise.all(
      prods.map(async (p) => {
        try {
          const res = await getSellerProductReviews(p.id, 1, 10)
          const reviews = res.reviews || []
          if (reviews.length > 0) {
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            ratings[p.id] = { avg: Math.round(avg * 10) / 10, count: res.total }
          } else {
            ratings[p.id] = { avg: 0, count: 0 }
          }
        } catch {
          ratings[p.id] = { avg: 0, count: 0 }
        }
      })
    )
    setProductRatings(ratings)
  }

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      await toggleWishlist(productId)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
      showToast('Removed from wishlist')
    } catch (err) {
      showToast('Failed to remove from wishlist')
    }
  }

  const handleAddToCart = async (product: SellerProduct) => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    try {
      setCartLoadingId(product.id)
      const res = await addToCart(product.id, 1)
      showToast(res.message || 'Added to cart')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to add to cart')
    } finally {
      setCartLoadingId(null)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-6 w-full min-h-screen">
        <PageTitleHero
          title="My Wishlist"
          subtitle="Your saved products, all in one place"
          backgroundImage="/assets/daing/danggit/slide1.jfif"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg p-8 text-center shadow-lg">
            <Heart className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Login to view your wishlist</h2>
            <p className="text-slate-600 mb-6">Sign in to save your favorite products and keep track of items you love.</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Login to Continue
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Page Hero */}
      <PageTitleHero
        title="My Wishlist"
        subtitle="Your saved products, all in one place"
        backgroundImage="/assets/daing/danggit/slide1.jfif"
      />

      {/* Back button */}
      <div className="flex items-center gap-4">
        <Link
          to="/catalog"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-xl text-slate-500">Loading wishlist...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white border border-blue-200 rounded-lg shadow-md">
          <Heart className="w-20 h-20 mx-auto text-slate-300 mb-4" />
          <div className="text-2xl text-slate-700 font-semibold mb-2">Your wishlist is empty</div>
          <p className="text-slate-500 mb-6">Start adding products you love!</p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {products.length} {products.length === 1 ? 'item' : 'items'} in wishlist
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const rating = productRatings[product.id] || { avg: 0, count: 0 }
              const hasImages = product.images && product.images.length > 0
              const mainImage = hasImages
                ? product.images[product.main_image_index || 0]?.url
                : null

              return (
                <div
                  key={product.id}
                  className="bg-white border border-blue-200 overflow-hidden group relative cursor-pointer shadow-md hover:shadow-lg hover:border-blue-400 transition-all duration-200 rounded-lg"
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFromWishlist(product.id)
                    }}
                    className="absolute top-2 right-2 z-10 p-2 bg-white/90 border border-red-300 text-red-500 rounded-full hover:bg-red-50 transition-colors"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Product Image */}
                  <Link to={`/catalog/${product.id}`}>
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
                            <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="w-3.5 h-3.5" /> {product.sold_count || 0}
                          </span>
                        </div>
                      </div>
                      {/* Category badge */}
                      {product.category_name && (
                        <div className="absolute top-2 left-2">
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-medium uppercase rounded">
                            {product.category_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Product Info */}
                  <Link to={`/catalog/${product.id}`}>
                    <div className="p-3 bg-gradient-to-b from-white to-blue-50">
                      <h3 className="font-bold text-slate-900 text-base line-clamp-2 mb-1">{product.name}</h3>
                      <p className="text-sm text-slate-500 mb-2">{product.seller_name}</p>

                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < Math.floor(rating.avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500">
                          {rating.count > 0 ? `${rating.avg} (${rating.count})` : 'No reviews'}
                        </span>
                      </div>

                      {/* Price and Stock */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-600 text-lg">
                          ₱{product.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">{product.stock_qty} in stock</span>
                      </div>
                    </div>
                  </Link>

                  {/* Add to Cart Button */}
                  <div className="p-3 pt-0">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock_qty <= 0 || product.is_disabled || (cartLoadingId === product.id)}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition-all ${
                        product.stock_qty <= 0 || product.is_disabled
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {cartLoadingId === product.id ? 'Adding...' : product.stock_qty <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
