import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import type { SellerProduct, ProductReview } from '../../services/api'
import { getSellerProductReviews } from '../../services/api'

interface ProductCardProps {
  product: SellerProduct
  onViewDetails?: (product: SellerProduct) => void
}

export default function ProductCard({ product, onViewDetails }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(product.main_image_index || 0)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [loadingReviews, setLoadingReviews] = useState(false)

  useEffect(() => {
    const loadReviews = async () => {
      if (!product.id) return
      setLoadingReviews(true)
      try {
        const res = await getSellerProductReviews(product.id, 1, 10)
        setReviews(res.reviews || [])
        if ((res.reviews || []).length > 0) {
          const avg = res.reviews.reduce((sum: number, r: ProductReview) => sum + r.rating, 0) / res.reviews.length
          setAvgRating(Math.round(avg * 10) / 10)
        }
      } catch (err) {
        console.error('Failed to load reviews:', err)
      } finally {
        setLoadingReviews(false)
      }
    }
    loadReviews()
  }, [product.id])

  const hasImages = product.images && product.images.length > 0
  const currentImage = hasImages ? product.images[currentImageIndex]?.url : null

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasImages) return
    setCurrentImageIndex((prev) => (prev === 0 ? product.images!.length - 1 : prev - 1))
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasImages) return
    setCurrentImageIndex((prev) => (prev === product.images!.length - 1 ? 0 : prev + 1))
  }

  return (
    <div
      onClick={() => onViewDetails?.(product)}
      className="bg-white rounded-lg border border-slate-200 overflow-hidden hover-lift group cursor-pointer h-full flex flex-col"
    >
      {/* Image Section */}
      <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 aspect-square overflow-hidden">
        {currentImage ? (
          <img src={currentImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-slate-400 text-sm">No image</span>
          </div>
        )}

        {/* Image Navigation */}
        {hasImages && product.images!.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {product.images!.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-2 h-2' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Stock Badge */}
        {product.stock_qty <= 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">Out of Stock</div>
        )}
        {product.is_disabled && (
          <div className="absolute top-2 left-2 bg-slate-500 text-white px-2 py-1 rounded text-xs font-semibold">Inactive</div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Product Name */}
        <h3 className="font-semibold text-slate-900 line-clamp-2 mb-1 text-sm">{product.name}</h3>

        {/* Seller Name */}
        <p className="text-xs text-slate-500 mb-2">{product.seller_name || 'Unknown Seller'}</p>

        {/* Category */}
        {product.category_name && (
          <p className="text-xs text-slate-400 mb-3 bg-slate-100 px-2 py-1 rounded inline-block max-w-fit">{product.category_name}</p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < Math.floor(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
              />
            ))}
          </div>
          <span className="text-xs text-slate-600">
            {loadingReviews ? '-' : reviews.length > 0 ? `${avgRating} (${reviews.length})` : 'No reviews'}
          </span>
        </div>

        {/* Price and Stock Info */}
        <div className="mt-auto">
          <div className="text-lg font-bold text-blue-600 mb-2">₱{product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
            <span>{product.stock_qty} in stock</span>
            {product.sold_count !== undefined && <span>{product.sold_count} sold</span>}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              // Placeholder for add to cart functionality
            }}
            disabled={product.stock_qty <= 0 || product.is_disabled}
            className={`w-full py-2 px-3 rounded font-medium text-sm transition-all ${
              product.stock_qty <= 0 || product.is_disabled
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {product.stock_qty <= 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
