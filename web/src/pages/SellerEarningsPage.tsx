/**
 * Seller Earnings & Payouts Page
 * Shows current earnings, commission, and payout history
 */
import React, { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

interface CurrentEarnings {
  total_sales: number
  commission_percent: number
  commission_amount: number
  amount_to_pay: number
  orders_count: number
}

interface PayoutRecord {
  id: string
  period: string
  total_sales: number
  commission_percent: number
  commission_amount: number
  amount_to_pay: number
  status: 'pending' | 'completed'
  paid_at?: string
  created_at: string
}

interface EarningsData {
  earnings: CurrentEarnings
  payout_history: PayoutRecord[]
}

const statusColors: Record<'pending' | 'completed', string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
}

const statusLabels: Record<'pending' | 'completed', string> = {
  pending: 'Pending',
  completed: 'Paid',
}

const statusIcons: Record<'pending' | 'completed', React.ElementType> = {
  pending: Clock,
  completed: CheckCircle,
}

export default function SellerEarningsPage() {
  const { user } = useAuth()
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadEarnings = async () => {
      try {
        const res = await api.get('/payouts/mysales')
        setEarnings(res.data)
      } catch (error) {
        console.error('Failed to load earnings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEarnings()
  }, [user])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (loading)
    return (
      <div className="space-y-6 w-full min-h-screen">
        <PageTitleHero
          title="My Earnings"
          subtitle="View your sales and payout history"
          backgroundImage="/assets/page-hero/orders.jpg"
        />
        <div className="flex items-center justify-center h-64 text-slate-500">Loading...</div>
      </div>
    )

  const current = earnings?.earnings
  const payouts = earnings?.payout_history || []

  return (
    <div className="space-y-6 w-full min-h-screen pb-6">
      {/* Page Hero */}
      <PageTitleHero
        title="My Earnings"
        subtitle="Track your sales and payout history"
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Current Earnings Summary */}
        {current && (
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              This Month's Earnings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales Card */}
              <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-700">Total Sales</span>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900">₱{formatCurrency(current.total_sales)}</div>
                <div className="text-xs text-slate-600 mt-1">{current.orders_count} orders</div>
              </div>

              {/* Commission Card */}
              <div className="bg-gradient-to-br from-white to-red-50 border border-red-200 shadow-md p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-red-700">Commission</span>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-600">-₱{formatCurrency(current.commission_amount)}</div>
                <div className="text-xs text-slate-600 mt-1">{current.commission_percent}% platform fee</div>
              </div>

              {/* You Get Card */}
              <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 shadow-md p-6 rounded-lg lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-700">You Get</span>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-4xl font-bold text-green-600">₱{formatCurrency(current.amount_to_pay)}</div>
                <div className="text-xs text-slate-600 mt-1">Amount to be paid out</div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Information */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-5 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-slate-900 mb-1">How Payouts Work</p>
              <p>
                Your earnings are calculated automatically each month based on orders. We deduct a {current?.commission_percent || '5'}% platform fee,
                and the remainder is paid out monthly. Payouts are processed around the 5th of the following month.
              </p>
            </div>
          </div>
        </div>

        {/* Payout History */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Payout History
          </h2>

          {payouts.length > 0 ? (
            <div className="bg-white border border-blue-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-blue-25 border-b border-blue-200">
                      <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="text-right px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                        Total Sales
                      </th>
                      <th className="text-right px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="text-right px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                        You Get
                      </th>
                      <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {payouts.map((payout) => {
                      const StatusIcon = statusIcons[payout.status]
                      return (
                        <tr key={payout.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-4 py-4 font-semibold text-slate-900">{payout.period}</td>
                          <td className="px-4 py-4 text-right text-slate-700 font-medium">
                            ₱{formatCurrency(payout.total_sales)}
                          </td>
                          <td className="px-4 py-4 text-right text-red-600 font-semibold">
                            -₱{formatCurrency(payout.commission_amount)}
                          </td>
                          <td className="px-4 py-4 text-right text-green-600 font-bold text-lg">
                            ₱{formatCurrency(payout.amount_to_pay)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium border rounded ${
                                statusColors[payout.status]
                              }`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusLabels[payout.status]}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center text-slate-700">
                            {payout.status === 'completed' ? formatDate(payout.paid_at || '') : formatDate(payout.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-blue-200 shadow-sm p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-lg">No payout history yet</p>
              <p className="text-slate-400 text-sm mt-1">Your first payout will appear here next month</p>
            </div>
          )}
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Questions about your earnings?</span> Contact our support team at{' '}
            <a href="mailto:support@dainggrader.com" className="text-blue-600 hover:underline">
              support@dainggrader.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
