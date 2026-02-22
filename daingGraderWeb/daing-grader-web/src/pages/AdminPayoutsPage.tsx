/**
 * Admin Payouts Management Page
 * Features: collapsible payout tables with filtering by seller/status, payout status updates
 */
import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Clock,
  DollarSign,
  User,
  AlertCircle,
} from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import { api } from '../services/api'

interface Payout {
  id: string
  seller_id: string
  seller_name: string
  period: string
  total_sales: number
  commission_percent: number
  commission_amount: number
  amount_to_pay: number
  status: 'pending' | 'completed'
  notes: string
  created_at: string
  paid_at?: string
}

interface PayoutsStats {
  total_payouts: number
  pending_payouts: number
  completed_payouts: number
  total_pending_amount: number
  total_paid_amount: number
}

const statusIcons: Record<'pending' | 'completed', React.ElementType> = {
  pending: Clock,
  completed: Check,
}

const statusColors: Record<'pending' | 'completed', string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
}

const statusLabels: Record<'pending' | 'completed', string> = {
  pending: 'Pending',
  completed: 'Completed',
}

function PayoutTable({
  payouts,
  title,
  isCollapsed,
  onToggleCollapse,
  onStatusUpdate,
}: {
  payouts: Payout[]
  title?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onStatusUpdate: (payoutId: string, newStatus: 'pending' | 'completed') => void
}) {
  const [page, setPage] = useState(1)
  const pageSize = 8
  const totalPages = Math.ceil(payouts.length / pageSize)
  const paginatedPayouts = payouts.slice((page - 1) * pageSize, page * pageSize)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status: 'pending' | 'completed') => statusColors[status]
  const StatusIcon = statusIcons['pending']

  return (
    <div className="bg-white border border-blue-200 shadow-sm overflow-hidden transition-all duration-300">
      {/* Table header with collapse toggle */}
      {title && (
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors bg-gradient-to-r from-white to-blue-50"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-blue-100">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-bold text-blue-900 text-base">{title}</span>
            <span className="text-sm text-white bg-blue-600 px-2 py-0.5 rounded">{payouts.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {isCollapsed ? 'Click to expand' : `Showing ${paginatedPayouts.length} of ${payouts.length}`}
            </span>
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-blue-600" />
            ) : (
              <ChevronUp className="w-5 h-5 text-blue-600" />
            )}
          </div>
        </div>
      )}

      {/* Table content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[3000px] opacity-100'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-50 to-blue-25 border-b border-blue-200">
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Seller
                </th>
                <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Period
                </th>
                <th className="text-right px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Total Sales
                </th>
                <th className="text-right px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Commission
                </th>
                <th className="text-right px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  To Pay
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {paginatedPayouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-4 font-medium text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    {payout.seller_name}
                  </td>
                  <td className="px-4 py-4 text-center text-slate-700 font-medium">{payout.period}</td>
                  <td className="px-4 py-4 text-right text-slate-900 font-semibold">
                    ₱{payout.total_sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 text-right text-red-600 font-semibold">
                    -{payout.commission_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    <span className="text-xs text-slate-600 ml-1">({payout.commission_percent}%)</span>
                  </td>
                  <td className="px-4 py-4 text-right text-green-600 font-bold text-lg">
                    ₱{payout.amount_to_pay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium border rounded ${getStatusColor(
                        payout.status
                      )}`}
                    >
                      {React.createElement(statusIcons[payout.status], { className: 'w-3.5 h-3.5' })}
                      {statusLabels[payout.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      {payout.status === 'pending' ? (
                        <button
                          onClick={() => onStatusUpdate(payout.id, 'completed')}
                          className="px-3 py-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">
                          Paid {formatDate(payout.paid_at || '')}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-blue-200 bg-slate-50">
            <div className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 border border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-blue-600" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 border border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPayoutsPage() {
  const [stats, setStats] = useState<PayoutsStats | null>(null)
  const [allPayouts, setAllPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadPayouts()
  }, [])

  const loadPayouts = async () => {
    try {
      const [statsRes, payoutsRes] = await Promise.all([
        api.get('/payouts/admin/stats'),
        api.get('/payouts/admin?page=1&page_size=100'),
      ])

      setStats(statsRes.data.stats)
      setAllPayouts(payoutsRes.data.payouts || [])
    } catch (error) {
      console.error('Failed to load payouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (payoutId: string, newStatus: 'pending' | 'completed') => {
    try {
      await api.put(`/payouts/admin/${payoutId}/status`, { status: newStatus })
      await loadPayouts()
    } catch (error) {
      console.error('Failed to update payout status:', error)
    }
  }

  const filteredPayouts = useMemo(() => {
    return allPayouts.filter((payout) => {
      if (statusFilter !== 'all' && payout.status !== statusFilter) return false
      if (searchQuery && !payout.seller_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [allPayouts, statusFilter, searchQuery])

  const payoutsByStatus = useMemo(() => {
    const grouped: Record<'pending' | 'completed', Payout[]> = {
      pending: [],
      completed: [],
    }

    filteredPayouts.forEach((payout) => {
      grouped[payout.status].push(payout)
    })

    return grouped
  }, [filteredPayouts])

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (loading) {
    return (
      <div className="space-y-6 w-full min-h-screen">
        <PageTitleHero
          title="Payout Management"
          subtitle="Track and manage seller payouts"
          backgroundImage="/assets/page-hero/orders.jpg"
        />
        <div className="flex items-center justify-center h-64 text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full min-h-screen pb-6">
      {/* Page Hero */}
      <PageTitleHero
        title="Payout Management"
        subtitle="Track and manage seller payouts"
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-lg">
            <div className="text-xs font-bold text-blue-700 mb-1">Total Payouts</div>
            <div className="text-2xl font-bold text-slate-900">{stats?.total_payouts ?? '-'}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-yellow-50 border border-yellow-200 shadow-md p-4 rounded-lg">
            <div className="text-xs font-bold text-yellow-700 mb-1">Pending</div>
            <div className="text-2xl font-bold text-slate-900">{stats?.pending_payouts ?? '-'}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 shadow-md p-4 rounded-lg">
            <div className="text-xs font-bold text-green-700 mb-1">Completed</div>
            <div className="text-2xl font-bold text-slate-900">{stats?.completed_payouts ?? '-'}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-orange-50 border border-orange-200 shadow-md p-4 rounded-lg">
            <div className="text-xs font-bold text-orange-700 mb-1">Pending Amount</div>
            <div className="text-lg font-bold text-slate-900">₱{formatCurrency(stats?.total_pending_amount ?? 0)}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-200 shadow-md p-4 rounded-lg">
            <div className="text-xs font-bold text-emerald-700 mb-1">Total Paid</div>
            <div className="text-lg font-bold text-slate-900">₱{formatCurrency(stats?.total_paid_amount ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search seller name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-blue-300 bg-white text-base focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed')}
            className="px-3 py-2.5 border border-blue-300 bg-white text-base min-w-[140px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Tables Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        {Object.entries(payoutsByStatus).map(
          ([status, payouts], index) =>
            payouts.length > 0 && (
              <div
                key={status}
                className="transition-all duration-500 ease-in-out"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'slideIn 0.4s ease-out forwards',
                }}
              >
                <PayoutTable
                  payouts={payouts}
                  title={`${statusLabels[status as 'pending' | 'completed']} Payouts`}
                  isCollapsed={collapsedSections[`status-${status}`] ?? false}
                  onToggleCollapse={() => toggleSection(`status-${status}`)}
                  onStatusUpdate={handleStatusUpdate}
                />
              </div>
            )
        )}
      </div>

      {filteredPayouts.length === 0 && !loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg">No payouts found</p>
        </div>
      )}
    </div>
  )
}
