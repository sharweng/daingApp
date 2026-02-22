import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShoppingCart,
  Trash2,
  Heart,
  ArrowLeft,
  Package,
  Loader,
  Check,
} from 'lucide-react'
import { getCart, updateCartItem, removeFromCart, type SellerProduct } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import PageTitleHero from '../components/layout/PageTitleHero'

interface CartItemData {
  product: SellerProduct
  qty: number
}

export default function CartPage() {
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { showToast } = useToast()
  const CHECKOUT_SELLER_KEY = 'checkout_seller_id'

  const [items, setItems] = useState<CartItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingQty, setUpdatingQty] = useState<string | null>(null)
  const [removingItem, setRemovingItem] = useState<string | null>(null)
  const [sellerSort, setSellerSort] = useState<'subtotal_desc' | 'subtotal_asc' | 'name_asc' | 'name_desc'>('subtotal_desc')

  // Load cart items
  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    const loadCart = async () => {
      setLoading(true)
      try {
        const res = await getCart()
        setItems(res.items || [])
      } catch (err: any) {
        const msg = err?.response?.data?.detail || 'Failed to load cart'
        showToast(msg)
      } finally {
        setLoading(false)
      }
    }

    loadCart()
  }, [isLoggedIn, navigate])

  const handleUpdateQuantity = async (productId: string, newQty: number) => {
    if (newQty < 1) return

    setUpdatingQty(productId)
    try {
      // Call the API to update quantity in backend
      await updateCartItem(productId, newQty)

      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, qty: newQty } : item
        )
      )
      showToast('Quantity updated')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to update quantity'
      showToast(msg)
    } finally {
      setUpdatingQty(null)
    }
  }

  const handleRemoveItem = async (productId: string) => {
    setRemovingItem(productId)
    try {
      // Call the API to remove from cart
      await removeFromCart(productId)
      
      // Update local state
      setItems((prev) => prev.filter((item) => item.product.id !== productId))
      showToast('Item removed from cart')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to remove item'
      showToast(msg)
    } finally {
      setRemovingItem(null)
    }
  }

  const handleMoveToWishlist = (productId: string) => {
    showToast('Move to wishlist feature coming soon')
    // TODO: Implement move to wishlist
  }

  const handleCheckoutSeller = (sellerId: string) => {
    sessionStorage.setItem(CHECKOUT_SELLER_KEY, sellerId)
    navigate('/checkout/address')
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.product.price * item.qty, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const deliveryCharges = items.length > 0 ? 0 : 0 // Free delivery for now
    return subtotal + deliveryCharges
  }

  const subtotal = calculateSubtotal()
  const deliveryCharges: number = 0
  const total = calculateTotal()
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0)

  const groupedItems = useMemo(() => {
    const groups: Record<string, { sellerId: string; sellerName: string; items: CartItemData[]; subtotal: number; totalQty: number }> = {}
    for (const item of items) {
      const sellerId = item.product.seller_id || 'unknown'
      const sellerName = item.product.seller_name || 'Unknown Seller'
      if (!groups[sellerId]) {
        groups[sellerId] = { sellerId, sellerName, items: [], subtotal: 0, totalQty: 0 }
      }
      groups[sellerId].items.push(item)
      groups[sellerId].subtotal += item.product.price * item.qty
      groups[sellerId].totalQty += item.qty
    }
    return Object.values(groups)
  }, [items])

  const sortedGroups = useMemo(() => {
    const groups = [...groupedItems]
    switch (sellerSort) {
      case 'subtotal_asc':
        return groups.sort((a, b) => a.subtotal - b.subtotal)
      case 'name_asc':
        return groups.sort((a, b) => a.sellerName.localeCompare(b.sellerName))
      case 'name_desc':
        return groups.sort((a, b) => b.sellerName.localeCompare(a.sellerName))
      case 'subtotal_desc':
      default:
        return groups.sort((a, b) => b.subtotal - a.subtotal)
    }
  }, [groupedItems, sellerSort])

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full bg-slate-50 pb-6">
        <PageTitleHero
          title="My Cart"
          subtitle="Review your items and proceed to checkout"
          backgroundImage="/assets/daing/danggit/slide1.jfif"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg p-8 text-center shadow-lg">
            <ShoppingCart className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Login to view your cart</h2>
            <p className="text-slate-600 mb-6">Sign in to save items, manage your cart, and complete your purchases.</p>
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

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading your cart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-6">
      {/* Page Hero */}
      <PageTitleHero
        title="My Cart"
        subtitle="Review your items and proceed to checkout"
        backgroundImage="/assets/daing/danggit/slide1.jfif"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </button>

        {/* Checkout Steps */}
        <div className="mb-8">
          <div className="flex items-center gap-4 justify-center">
            {/* Step 1 - Cart */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm mb-2">
                1
              </div>
              <span className="text-xs font-medium text-slate-700">Cart</span>
            </div>

            {/* Divider */}
            <div className="flex-1 h-0.5 bg-slate-300 max-w-xs mx-2" />

            {/* Step 2 - Address */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm mb-2">
                2
              </div>
              <span className="text-xs font-medium text-slate-600">Address</span>
            </div>

            {/* Divider */}
            <div className="flex-1 h-0.5 bg-slate-300 max-w-xs mx-2" />

            {/* Step 3 - Payment */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm mb-2">
                3
              </div>
              <span className="text-xs font-medium text-slate-600">Payment</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-700 mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-6">Add some items to get started!</p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ShoppingCart className="w-4 h-4" />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT - Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {sortedGroups.map((group) => (
                <div key={group.sellerId} className="bg-white border border-blue-200 rounded-xl p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">Seller</p>
                      <p className="text-sm font-bold text-slate-900">{group.sellerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Items: {group.totalQty}</p>
                      <p className="text-sm font-semibold text-blue-700">
                        ₱{group.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {group.items.map((item) => {
                    const hasImages = item.product.images && item.product.images.length > 0
                    const mainImage = hasImages
                      ? item.product.images[item.product.main_image_index || 0]?.url
                      : null

                    return (
                      <div
                        key={item.product.id}
                        className="bg-white border border-slate-200 rounded-lg p-4 flex gap-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex-shrink-0">
                          <Link
                            to={`/catalog/${item.product.id}`}
                            className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity"
                          >
                            {mainImage ? (
                              <img
                                src={mainImage}
                                alt={item.product.name}
                                className="block w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-8 h-8 text-slate-300" />
                            )}
                          </Link>
                        </div>

                        <div className="flex-1">
                          <Link
                            to={`/catalog/${item.product.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block mb-1"
                          >
                            {item.product.name}
                          </Link>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                            {item.product.category_name && (
                              <>
                                <span>{item.product.category_name}</span>
                                <span className="text-slate-300">•</span>
                              </>
                            )}
                            {item.product.stock_qty > 0 && (
                              <>
                                <span>In Stock</span>
                                <span className="text-slate-300">•</span>
                              </>
                            )}
                            <span className="text-green-600 font-medium">Free Delivery</span>
                          </div>

                          <div className="mb-4">
                            <span className="text-2xl font-bold text-slate-900">
                              ₱{item.product.price.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50">
                              <button
                                onClick={() => handleUpdateQuantity(item.product.id, item.qty - 1)}
                                disabled={item.qty <= 1 || updatingQty === item.product.id}
                                className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                −
                              </button>
                              <span className="px-4 py-2 font-medium text-slate-900 text-center min-w-16">
                                {item.qty}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.product.id, item.qty + 1)}
                                disabled={item.qty >= item.product.stock_qty || updatingQty === item.product.id}
                                className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item.product.id)}
                              disabled={removingItem === item.product.id}
                              className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>

                          <button
                            onClick={() => handleMoveToWishlist(item.product.id)}
                            className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <Heart className="w-3 h-3" />
                            Move to Wishlist
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  <div className="pt-3 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => handleCheckoutSeller(group.sellerId)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT - Price Details */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-lg p-6 sticky top-24 space-y-4">
                <h3 className="font-bold text-slate-900 mb-4">Price Details</h3>

                <div className="space-y-3 border-b border-slate-200 pb-4">
                  {/* Items */}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Price ({totalQty} item{totalQty !== 1 ? 's' : ''})
                    </span>
                    <span className="font-medium text-slate-900">
                      ₱{subtotal.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Discount */}
                  {false && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Discount</span>
                      <span className="font-medium text-green-600">−₱0.00</span>
                    </div>
                  )}

                  {/* Delivery Charges */}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Delivery Charges</span>
                    {deliveryCharges === 0 ? (
                      <span className="font-medium text-green-600">Free</span>
                    ) : (
                      <span className="font-medium text-slate-900">
                        ₱{deliveryCharges.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Total Amount */}
                <div className="flex justify-between text-base font-bold py-4 border-b border-slate-200">
                  <span className="text-slate-900">Total Amount</span>
                  <span className="text-slate-900">
                    ₱{total.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg p-3">
                  <label className="text-xs font-semibold text-slate-600">Seller Sorting</label>
                  <select
                    value={sellerSort}
                    onChange={(e) => setSellerSort(e.target.value as typeof sellerSort)}
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="subtotal_desc">Highest total first</option>
                    <option value="subtotal_asc">Lowest total first</option>
                    <option value="name_asc">Seller name A-Z</option>
                    <option value="name_desc">Seller name Z-A</option>
                  </select>
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded p-3">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>You will save ₱0.00 on this order</span>
                </div>

                <div className="text-xs text-slate-500">
                  Checkout is done per seller. Use the "Proceed to Checkout" button in each seller section.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
