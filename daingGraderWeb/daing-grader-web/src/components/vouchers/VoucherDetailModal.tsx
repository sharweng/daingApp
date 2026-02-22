import React from 'react'
import { X, Calendar, Users, TrendingUp, Gift, DollarSign, Percent } from 'lucide-react'

interface VoucherDetailModalProps {
  isOpen: boolean
  onClose: () => void
  voucher: {
    _id: string
    code: string
    discount_type: 'fixed' | 'percentage'
    value: number
    expiration_date?: string
    max_uses?: number
    current_uses: number
    per_user_limit?: number
    min_order_amount?: number
    active: boolean
    created_at: string
    seller_name?: string
  }
}

export default function VoucherDetailModal({ isOpen, onClose, voucher }: VoucherDetailModalProps) {
  if (!isOpen) return null

  const isExpired = voucher.expiration_date && new Date(voucher.expiration_date) <= new Date()
  const remainingUses = voucher.max_uses ? voucher.max_uses - voucher.current_uses : null
  const usagePercentage = voucher.max_uses ? (voucher.current_uses / voucher.max_uses) * 100 : 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString()}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">{voucher.code}</h2>
            {voucher.seller_name && (
              <p className="text-blue-100 text-sm mt-1">by {voucher.seller_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${
                isExpired
                  ? 'bg-red-500'
                  : !voucher.active
                    ? 'bg-slate-500'
                    : voucher.max_uses && remainingUses === 0
                      ? 'bg-orange-500'
                      : 'bg-emerald-500'
              }`}
            >
              {isExpired ? 'Expired' : !voucher.active ? 'Inactive' : remainingUses === 0 ? 'Usage Limit Reached' : 'Active'}
            </div>
          </div>

          {/* Discount Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Discount</span>
              <div className="flex items-center gap-2">
                {voucher.discount_type === 'percentage' ? (
                  <>
                    <Percent className="w-6 h-6 text-blue-600" />
                    <span className="text-3xl font-bold text-blue-600">{voucher.value}%</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    <span className="text-3xl font-bold text-blue-600">{formatCurrency(voucher.value)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Expiration Date */}
            {voucher.expiration_date && (
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase">Expires</span>
                </div>
                <p className={`font-semibold ${isExpired ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatDate(voucher.expiration_date)}
                </p>
              </div>
            )}

            {/* Usage */}
            {voucher.max_uses && (
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase">Usage</span>
                </div>
                <p className="font-semibold text-slate-900 mb-2">
                  {voucher.current_uses} / {voucher.max_uses} uses
                </p>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Per User Limit */}
            {voucher.per_user_limit && (
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase">Per User</span>
                </div>
                <p className="font-semibold text-slate-900">Max {voucher.per_user_limit} use(s)</p>
              </div>
            )}

            {/* Minimum Order */}
            {voucher.min_order_amount && (
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase">Min Order</span>
                </div>
                <p className="font-semibold text-slate-900">{formatCurrency(voucher.min_order_amount)}</p>
              </div>
            )}
          </div>

          {/* Created Info */}
          <div className="text-xs text-slate-500 pt-4 border-t border-slate-200">
            Created on {formatDate(voucher.created_at)}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
