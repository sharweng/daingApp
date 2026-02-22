import React from 'react'
import { Download, Package, MapPin, Calendar, CreditCard, Store } from 'lucide-react'
import type { OrderDetail } from '../../services/api'

interface OrderReceiptProps {
  order: OrderDetail
  onDownload?: (order: OrderDetail) => void
  showDownload?: boolean
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

const formatMoney = (value: number) =>
  `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function OrderReceipt({ order, onDownload, showDownload = true }: OrderReceiptProps) {
  const items = order.items || []
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-500 font-semibold">Receipt</p>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">Thank you for your purchase!</h2>
            <p className="text-slate-600 mt-3 max-w-md">
              Your order has been confirmed and will be processed within 24 hours during business days.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Billing Address
            </h3>
            <div className="text-sm text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900">{order.address?.full_name || 'N/A'}</div>
              <div>{order.address?.address_line || 'No address provided'}</div>
              <div>
                {[order.address?.city, order.address?.province, order.address?.postal_code].filter(Boolean).join(', ') || '—'}
              </div>
              {order.address?.phone && <div>{order.address.phone}</div>}
            </div>
          </div>

          {showDownload && (
            <button
              onClick={() => onDownload?.(order)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Receipt
            </button>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Order Summary</h3>
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
              #{order.order_number || order.id.slice(-8)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-slate-600 mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              {formatDate(order.created_at)}
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              {(order.payment_method || 'cod').toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-500" />
              {order.seller_name || 'DaingGrader Store'}
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={`${item.product_id}-${index}`} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">{item.name}</div>
                  <div className="text-xs text-slate-500">Qty: {item.qty}</div>
                </div>
                <div className="text-sm font-semibold text-slate-900">{formatMoney(item.price)}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 mt-5 pt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Shipping</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Order Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
