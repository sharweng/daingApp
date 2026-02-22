import React, { useEffect, useMemo, useState } from 'react'
import { Package, Truck, CheckCircle, XCircle, RefreshCcw, MapPin, User, Phone, Mail, Calendar, ShoppingBag, X } from 'lucide-react'
import PageTitleHero from '../../components/layout/PageTitleHero'
import { getSellerOrders, updateSellerOrderStatus, type OrderDetail } from '../../services/api'
import { useToast } from '../../contexts/ToastContext'

type OrderStatus = 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusStyles: Record<OrderStatus, string> = {
  confirmed: 'bg-slate-100 text-slate-700 border-slate-200',
  shipped: 'bg-orange-100 text-orange-700 border-orange-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const statusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'shipped':
      return <Truck className="w-4 h-4" />
    case 'delivered':
      return <CheckCircle className="w-4 h-4" />
    case 'cancelled':
      return <XCircle className="w-4 h-4" />
    default:
      return <Package className="w-4 h-4" />
  }
}

const normalizeStatus = (status: string): OrderStatus => {
  const value = (status || '').toLowerCase()
  if (value === 'shipped') return 'shipped'
  if (value === 'delivered') return 'delivered'
  if (value === 'cancelled' || value === 'canceled') return 'cancelled'
  return 'confirmed'
}

export default function SellerOrdersPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState<OrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null)
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({})
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [showModal, setShowModal] = useState(false)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await getSellerOrders(1, 50)
      setOrders(res.orders || [])
      const initialDrafts: Record<string, OrderStatus> = {}
      for (const order of res.orders || []) {
        initialDrafts[order.id] = normalizeStatus(order.status)
      }
      setStatusDrafts(initialDrafts)
    } catch {
      showToast('Failed to load seller orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const rows = useMemo(() => {
    return orders.map((order) => {
      const customer = order.address?.full_name || 'Customer'
      const itemsCount = order.total_items || order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0
      return {
        id: order.id,
        order_number: order.order_number || order.id,
        customer,
        status: normalizeStatus(order.status),
        total: order.total,
        itemsCount,
        created_at: order.created_at,
      }
    })
  }, [orders])

  const handleStatusChange = (orderId: string, value: OrderStatus) => {
    setStatusDrafts((prev) => ({ ...prev, [orderId]: value }))
  }

  const handleUpdate = async (orderId: string) => {
    const nextStatus = statusDrafts[orderId]
    if (!nextStatus) return
    setSavingOrderId(orderId)
    try {
      const res = await updateSellerOrderStatus(orderId, nextStatus)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? res.order : order)))
      showToast('Order status updated')
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(res.order)
      }
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to update order')
    } finally {
      setSavingOrderId(null)
    }
  }

  const handleRowClick = (order: OrderDetail) => {
    setSelectedOrder(order)
  }

  const handleModalOpen = (order: OrderDetail, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedOrder(order)
    setShowModal(true)
  }

  return (
    <>
      <PageTitleHero
        title="Order Management"
        subtitle="Track and manage customer orders"
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      <div className="flex h-[calc(100vh-14rem)] gap-4 overflow-hidden px-6 py-4">
      {/* LEFT PANEL - Order List */}
      <div className="w-2/5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-blue-900">Orders</h1>
            <p className="text-sm text-slate-600">Track and update fulfillment status.</p>
          </div>
          <button
            onClick={loadOrders}
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
              <span className="font-bold text-blue-900 text-base">Order List</span>
              <span className="text-sm text-white bg-blue-600 px-2 py-0.5 rounded">{orders.length}</span>
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
            ) : rows.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No orders yet.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-blue-100">
                {rows.map((row) => {
                  const order = orders.find((o) => o.id === row.id)!
                  const isSelected = selectedOrder?.id === row.id
                  return (
                    <div
                      key={row.id}
                      onClick={() => handleRowClick(order)}
                      className={`px-4 py-4 cursor-pointer transition-colors hover:bg-blue-50 ${
                        isSelected ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 text-sm mb-1">{row.order_number}</div>
                          <div className="text-xs text-slate-500 mb-2">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold border rounded ${
                            statusStyles[row.status]
                          }`}
                        >
                          {statusIcon(row.status)}
                          {statusOptions.find((opt) => opt.value === row.status)?.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="text-slate-600">
                          <User className="w-3.5 h-3.5 inline mr-1" />
                          {row.customer}
                        </div>
                        <div className="font-semibold text-blue-700">
                          ₱{row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {row.itemsCount} item{row.itemsCount !== 1 ? 's' : ''}
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
          <div className="flex-1 bg-white border border-blue-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-blue-900">Order #{selectedOrder.order_number || selectedOrder.id}</h2>
                  <p className="text-sm text-slate-600">
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
                  onClick={(e) => handleModalOpen(selectedOrder, e)}
                  className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50"
                >
                  View Full Details
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
                        {statusIcon(normalizeStatus(selectedOrder.status))}
                        <span className="font-semibold text-sm text-slate-900">
                          {statusOptions.find((opt) => opt.value === normalizeStatus(selectedOrder.status))?.label}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/70 rounded-md p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">Total Items</p>
                      <p className="font-bold text-lg text-slate-900">{selectedOrder.total_items || selectedOrder.items?.length || 0}</p>
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
                        <p className="text-sm text-slate-900 font-medium">
                          {selectedOrder.address?.full_name || 'N/A'}
                        </p>
                        <p className="text-sm text-slate-700">
                          {selectedOrder.address?.address_line || 'No address provided'}
                        </p>
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
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Name</p>
                    <p className="text-slate-900 font-medium">{selectedOrder.address?.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Phone</p>
                    <p className="text-slate-900">{selectedOrder.address?.phone || 'N/A'}</p>
                  </div>
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Update Controls */}
              <div className="bg-white border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Update Order Status</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={statusDrafts[selectedOrder.id] || normalizeStatus(selectedOrder.status)}
                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={() => handleUpdate(selectedOrder.id)}
                    disabled={savingOrderId === selectedOrder.id}
                    className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingOrderId === selectedOrder.id ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Note: You can mark orders as <strong>Shipped</strong> or <strong>Cancelled</strong>. Customers will be notified by email. Once shipped, only the customer can mark it as Delivered.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white border border-blue-200 shadow-sm rounded-lg flex items-center justify-center">
            <div className="text-center text-slate-400">
              <Package className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium">Select an order to view details</p>
              <p className="text-sm">Click on an order from the list to see delivery summary and manage status</p>
            </div>
          </div>
        )}
      </div>

      {/* Full Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Full Order Details</h2>
                <p className="text-sm text-slate-600">Order #{selectedOrder.order_number || selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-700 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Order Status */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Order Status</h3>
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusStyles[normalizeStatus(selectedOrder.status)]}`}>
                  {statusIcon(normalizeStatus(selectedOrder.status))}
                  <span className="font-medium">
                    {statusOptions.find((opt) => opt.value === normalizeStatus(selectedOrder.status))?.label}
                  </span>
                </div>
              </div>

              {/* Customer & Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Name</p>
                      <p className="text-slate-900 font-medium">{selectedOrder.address?.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Phone</p>
                      <p className="text-slate-900">{selectedOrder.address?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Delivery Address
                  </h3>
                  <div className="text-sm text-slate-700 space-y-1">
                    <p>{selectedOrder.address?.address_line || 'N/A'}</p>
                    <p>
                      {[selectedOrder.address?.city, selectedOrder.address?.province, selectedOrder.address?.postal_code]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Items ({selectedOrder.items?.length || 0})</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-20 h-20 bg-slate-200 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 mb-1">{item.name}</h4>
                        <p className="text-xs text-slate-600 mb-2">Quantity: {item.qty}</p>
                        <p className="text-sm font-bold text-blue-600">
                          ₱{item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-slate-900 mb-3">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="text-slate-900">
                      ₱{selectedOrder.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-blue-700 text-lg">
                      ₱{selectedOrder.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Date */}
              <div className="text-sm text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Placed on{' '}
                {selectedOrder.created_at
                  ? new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
