import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Package,
  MapPin,
  Truck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  User,
  Phone,
  ShoppingBag,
  Calendar,
  Star,
  RefreshCcw,
} from 'lucide-react'
import { downloadOrderReceipt, getOrders, markOrderDelivered, cancelOrder, type OrderDetail } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import PageTitleHero from '../components/layout/PageTitleHero'

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'cancelled' | 'arrived'

const normalizeStatus = (status: string): OrderStatus => {
  const value = (status || '').toLowerCase()
  if (['cancelled', 'canceled', 'failed'].includes(value)) return 'cancelled'
  if (['arrived', 'delivered', 'completed'].includes(value)) return 'arrived'
  if (['shipped', 'on_shipping', 'on_delivery'].includes(value)) return 'shipped'
  if (['confirmed'].includes(value)) return 'confirmed'
  if (['pending'].includes(value)) return 'pending'
  return 'pending'
}

const formatAddress = (address?: OrderDetail['address']) => {
  if (!address) return 'No address set'
  const parts = [address.address_line, address.city, address.province].filter(Boolean)
  return parts.join(', ') || 'No address set'
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Truck className="w-4 h-4 text-blue-600" />
    case 'confirmed':
      return <CheckCircle className="w-4 h-4 text-blue-600" />
    case 'shipped':
      return <Truck className="w-4 h-4 text-orange-600" />
    case 'arrived':
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-red-600" />
    default:
      return null
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
    case 'confirmed':
      return { label: 'Confirmed', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
    case 'shipped':
      return { label: 'Shipped', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' }
    case 'arrived':
      return { label: 'Delivered', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
    case 'cancelled':
      return { label: 'Canceled', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
    default:
      return { label: 'Unknown', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' }
  }
}

export default function OrdersPage() {
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [orders, setOrders] = useState<OrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [markingDelivered, setMarkingDelivered] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await getOrders(1, 50)
      setOrders(res.orders || [])
      if (res.orders && res.orders.length > 0 && !selectedOrder) {
        setSelectedOrder(res.orders[0])
      }
    } catch (err) {
      showToast('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return
    loadOrders()
  }, [isLoggedIn])

  const handleMarkDelivered = async () => {
    if (!selectedOrder) return
    const currentStatus = (selectedOrder.status || '').toLowerCase()
    if (currentStatus !== 'shipped') {
      showToast('Only shipped orders can be marked as delivered')
      return
    }
    setMarkingDelivered(true)
    try {
      const res = await markOrderDelivered(selectedOrder.id)
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? res.order : o)))
      setSelectedOrder(res.order)
      showToast('Order marked as delivered!')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to update order')
    } finally {
      setMarkingDelivered(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!selectedOrder) return
    const currentStatus = (selectedOrder.status || '').toLowerCase()
    if (!['pending', 'confirmed'].includes(currentStatus)) {
      showToast('Only pending or confirmed orders can be cancelled')
      return
    }
    if (!confirm('Are you sure you want to cancel this order?')) {
      return
    }
    setCancelling(true)
    try {
      const res = await cancelOrder(selectedOrder.id)
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? res.order : o)))
      setSelectedOrder(res.order)
      showToast('Order cancelled successfully')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  const handleReviewProduct = (productId: string) => {
    navigate(`/catalog/${productId}`)
  }

  const handleDownloadReceipt = async () => {
    if (!selectedOrder) return
    setDownloadingId(selectedOrder.id)
    try {
      const { blob, filename } = await downloadOrderReceipt(selectedOrder.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to download receipt')
    } finally {
      setDownloadingId(null)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Please log in</h2>
          <Link to="/login" className="text-blue-600 hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  const canMarkDelivered = selectedOrder && (selectedOrder.status || '').toLowerCase() === 'shipped'
  const isDelivered =
    selectedOrder && ['delivered', 'arrived', 'completed'].includes((selectedOrder.status || '').toLowerCase())
  const canCancel = selectedOrder && ['pending', 'confirmed'].includes((selectedOrder.status || '').toLowerCase())

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-6">
      {/* Page Hero */}
      <PageTitleHero
        title="My Orders"
        subtitle="Track and review your recent purchases"
        backgroundImage="/assets/daing/danggit/slide1.jfif"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <Link to="/profile" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        {/* Split View Container */}
        <div className="flex gap-4 h-[calc(100vh-16rem)]">
          {/* LEFT PANEL - Order List */}
          <div className="w-2/5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Order List</h2>
                <p className="text-sm text-slate-600">{orders.length} total orders</p>
              </div>
              <button
                onClick={loadOrders}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors text-sm"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="flex-1 bg-white border border-slate-200 shadow-sm overflow-hidden rounded-lg flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-900 text-base">All Orders</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64 text-slate-500">
                    <div className="text-center">
                      <Package className="w-12 h-12 mx-auto mb-3 animate-pulse text-slate-300" />
                      <p>Loading orders...</p>
                    </div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-slate-500">
                    <div className="text-center">
                      <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No orders yet.</p>
                      <Link to="/catalog" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                        Start Shopping
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {orders.map((order) => {
                      const isSelected = selectedOrder?.id === order.id
                      const statusInfo = getStatusLabel(normalizeStatus(order.status))
                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`px-4 py-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 text-sm mb-1">
                                #{order.order_number || order.id.slice(-8)}
                              </div>
                              <div className="text-xs text-slate-500 mb-2">
                                {order.created_at
                                  ? new Date(order.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : '—'}
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold border rounded ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}
                            >
                              {getStatusIcon(normalizeStatus(order.status))}
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="text-slate-600 text-xs">
                              <ShoppingBag className="w-3.5 h-3.5 inline mr-1" />
                              {order.total_items || order.items?.length || 0} item(s)
                            </div>
                            <div className="font-semibold text-blue-700">
                              ₱{order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

          {/* RIGHT PANEL - Order Details & Delivery Summary */}
          <div className="flex-1 flex flex-col">
            {selectedOrder ? (
              <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-blue-900">
                        Order #{selectedOrder.order_number || selectedOrder.id.slice(-8)}
                      </h2>
                      <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {selectedOrder.created_at
                          ? new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </p>
                    </div>
                        <button
                          onClick={handleDownloadReceipt}
                          disabled={downloadingId === selectedOrder.id}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-60"
                        >
                          {downloadingId === selectedOrder.id ? 'Preparing...' : 'Download Receipt'}
                        </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Delivery Summary */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5">
                    <h3 className="text-base font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Delivery Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/70 rounded-md p-3 text-center">
                          <p className="text-xs text-slate-500 mb-1">Status</p>
                          <div className="flex items-center justify-center gap-1.5">
                            {getStatusIcon(normalizeStatus(selectedOrder.status))}
                            <span className="font-semibold text-sm text-slate-900">
                              {getStatusLabel(normalizeStatus(selectedOrder.status)).label}
                            </span>
                          </div>
                        </div>
                        <div className="bg-white/70 rounded-md p-3 text-center">
                          <p className="text-xs text-slate-500 mb-1">Total Items</p>
                          <p className="font-bold text-lg text-slate-900">
                            {selectedOrder.total_items || selectedOrder.items?.length || 0}
                          </p>
                        </div>
                        <div className="bg-white/70 rounded-md p-3 text-center">
                          <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                          <p className="font-bold text-lg text-blue-700">
                            ₱{selectedOrder.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/70 rounded-md p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Delivery Address</p>
                            <p className="text-sm text-slate-900 font-medium">{selectedOrder.address?.full_name || 'N/A'}</p>
                            <p className="text-sm text-slate-700">{selectedOrder.address?.address_line || 'No address provided'}</p>
                            <p className="text-sm text-slate-700">
                              {[selectedOrder.address?.city, selectedOrder.address?.province, selectedOrder.address?.postal_code]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </p>
                            {selectedOrder.address?.phone && (
                              <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                {selectedOrder.address.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {canMarkDelivered && (
                        <button
                          onClick={handleMarkDelivered}
                          disabled={markingDelivered}
                          className="w-full px-4 py-3 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          {markingDelivered ? 'Updating...' : 'Mark as Delivered'}
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={handleCancelOrder}
                          disabled={cancelling}
                          className="w-full px-4 py-3 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          {cancelling ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Order Items ({selectedOrder.items?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                          <div className="w-16 h-16 bg-slate-200 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-slate-900 mb-1 line-clamp-2">{item.name}</h4>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">Qty: {item.qty}</span>
                              <span className="font-semibold text-blue-700">
                                ₱{item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {/* Leave Review Button for Delivered Items */}
                            {isDelivered && (
                              <button
                                onClick={() => handleReviewProduct(item.product_id)}
                                className="mt-2 px-3 py-1.5 text-xs font-semibold bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center gap-1"
                              >
                                <Star className="w-3.5 h-3.5" />
                                Leave a Review
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <Package className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select an order to view details</p>
                  <p className="text-sm">Click on an order from the list to see delivery summary</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
