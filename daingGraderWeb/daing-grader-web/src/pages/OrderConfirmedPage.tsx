import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader } from 'lucide-react'
import { downloadOrderReceipt, getOrderById, type OrderDetail } from '../services/api'
import PageTitleHero from '../components/layout/PageTitleHero'
import OrderReceipt from '../components/orders/OrderReceipt'
import { useToast } from '../contexts/ToastContext'

const CHECKOUT_EMAIL_STATUS_KEY = 'checkout_email_status'

export default function OrderConfirmedPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderDetail[]>([])
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<
    { order_id?: string; buyer_sent: boolean; seller_sent: boolean; buyer_error?: string; seller_error?: string }[]
  >([])

  const orderIds = useMemo(() => {
    const idsParam = (searchParams.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean)
    if (idsParam.length > 0) return idsParam
    return orderId ? [orderId] : []
  }, [orderId, searchParams])

  useEffect(() => {
    if (orderIds.length === 0) {
      setLoading(false)
      return
    }
    const loadOrders = async () => {
      setLoading(true)
      try {
        const results = await Promise.all(orderIds.map((id) => getOrderById(id)))
        setOrders(results.map((res) => res.order).filter(Boolean))
      } catch (err: any) {
        showToast(err?.response?.data?.detail || 'Failed to load order receipt')
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [orderIds, showToast])

  useEffect(() => {
    const saved = sessionStorage.getItem(CHECKOUT_EMAIL_STATUS_KEY)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        setEmailStatus(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  const emailSummary = useMemo(() => {
    if (!emailStatus.length) return null
    const relevant = emailStatus.filter((entry) => !orderIds.length || orderIds.includes(entry.order_id || ''))
    if (!relevant.length) return null
    const buyerFailed = relevant.some((entry) => !entry.buyer_sent)
    const sellerFailed = relevant.some((entry) => !entry.seller_sent)
    if (buyerFailed || sellerFailed) {
      return { type: 'error', message: 'Receipt email failed to send for one or more recipients. Please try again later.' }
    }
    return { type: 'success', message: 'Receipt email sent to buyer and seller.' }
  }, [emailStatus, orderIds])

  const handleDownloadReceipt = async (order: OrderDetail) => {
    setDownloadingId(order.id)
    try {
      const { blob, filename } = await downloadOrderReceipt(order.id)
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

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading order...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-6">
      <PageTitleHero
        title="Order Confirmed"
        subtitle="Your order has been placed successfully"
        backgroundImage="/assets/daing/danggit/slide1.jfif"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {emailSummary && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
              emailSummary.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {emailSummary.message}
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank you for your order!</h2>
          <p className="text-slate-600 mb-4">
            {orders.length > 1
              ? `Your items were split into ${orders.length} orders by seller.`
              : 'Your order has been confirmed.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/orders" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              View Orders
            </Link>
            <Link to="/catalog" className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-600">
            No order details found.
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="relative">
                {downloadingId === order.id && (
                  <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center text-sm text-slate-600 z-10">
                    Preparing receipt...
                  </div>
                )}
                <OrderReceipt order={order} onDownload={handleDownloadReceipt} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
