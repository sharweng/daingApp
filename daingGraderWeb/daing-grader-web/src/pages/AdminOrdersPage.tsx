/**
 * Admin Orders Management Page
 * Features: collapsible tables with filtering by status/seller, order detail modal
 */
import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  X,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Maximize2,
  BarChart3,
  Store,
  UserCheck,
} from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import {
  getAdminOrders,
  getAdminOrdersStats,
  getAdminOrderDetail,
  updateAdminOrderStatus,
  type AdminOrder,
  type AdminOrderDetail,
  type AdminOrdersStats,
} from '../services/api'

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
type FilterStatus = 'all' | OrderStatus
type FilterSeller = 'all' | string

const statusIcons: Record<OrderStatus, React.ElementType> = {
  pending: AlertCircle,
  confirmed: CheckCircle,
  shipped: Truck,
  delivered: ShoppingCart,
  cancelled: X,
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped: 'bg-purple-100 text-purple-700 border-purple-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function OrdersTable({
  orders,
  title,
  filterType,
  filterValue,
  isCollapsed,
  onToggleCollapse,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onViewOrder,
}: {
  orders: AdminOrder[]
  title?: string
  filterType?: 'status' | 'seller'
  filterValue?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onViewOrder: (order: AdminOrder) => void
}) {
  const [page, setPage] = useState(1)
  const pageSize = 8
  const totalPages = Math.ceil(orders.length / pageSize)
  const paginatedOrders = orders.slice((page - 1) * pageSize, page * pageSize)
  const allSelected = paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedIds.has(o.id))

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status: OrderStatus) => statusColors[status]
  const StatusIcon = filterType && filterValue ? statusIcons[filterValue as OrderStatus] : null

  return (
    <div className="bg-white border border-blue-200 shadow-sm overflow-hidden transition-all duration-300">
      {/* Table header with collapse toggle */}
      {title && (
        <div
          className={`flex items-center justify-between px-5 py-4 border-b border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors bg-gradient-to-r from-white to-blue-50`}
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-3">
            {StatusIcon && (
              <div className={`p-2 rounded ${getStatusColor(filterValue as OrderStatus).split(' ')[0]}`}>
                <StatusIcon className="w-5 h-5" />
              </div>
            )}
            <span className="font-bold text-blue-900 text-base">{title}</span>
            <span className="text-sm text-white bg-blue-600 px-2 py-0.5 rounded">{orders.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {isCollapsed ? 'Click to expand' : `Showing ${paginatedOrders.length} of ${orders.length}`}
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
            <thead className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-200">
              <tr>
                <th className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        onSelectAll([])
                      } else {
                        onSelectAll(paginatedOrders.map((o) => o.id))
                      }
                    }}
                    className="w-4 h-4 accent-blue-600"
                  />
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Order #
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Buyer
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Seller
                </th>
                <th className="text-right px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => onToggleSelect(order.id)}
                      className="w-4 h-4 accent-blue-600"
                    />
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900">{order.order_number}</td>
                  <td className="px-4 py-4 text-slate-700">{order.buyer_name}</td>
                  <td className="px-4 py-4 text-slate-700">{order.seller_name}</td>
                  <td className="px-4 py-4 text-right font-semibold text-blue-700">
                    ₱{order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium border rounded ${getStatusColor(order.status)}`}>
                      {React.createElement(statusIcons[order.status], { className: 'w-3.5 h-3.5' })}
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => onViewOrder(order)}
                        className="p-2 hover:bg-blue-100 text-slate-500 hover:text-blue-700 border border-transparent hover:border-blue-300 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

/**
 * Seller Sales Distribution Bar Chart - shows successful orders per seller
 */
function SellerSalesBarChart({ orders }: { orders: AdminOrder[] }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const sellerData = useMemo(() => {
    const sellerCounts: Record<string, number> = {}
    
    orders.forEach((order) => {
      if (order.status === 'delivered') {
        sellerCounts[order.seller_name] = (sellerCounts[order.seller_name] || 0) + 1
      }
    })

    return Object.entries(sellerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 sellers
  }, [orders])

  const maxValue = Math.max(...sellerData.map(d => d.count), 1)
  
  const width = 600
  const height = 240
  const padding = { top: 20, right: 24, bottom: 60, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const barWidth = sellerData.length > 0 ? Math.min(chartWidth / sellerData.length - 8, 60) : 40

  return (
    <div className="h-full flex flex-col relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid lines and Y-axis */}
        {[1, 0.75, 0.5, 0.25, 0].map((tick, i) => {
          const y = padding.top + chartHeight - tick * chartHeight
          const value = Math.round(maxValue * tick)
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#DBEAFE"
                strokeWidth="1"
              />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#64748B">
                {value}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {sellerData.map((data, idx) => {
          const x = padding.left + (idx * (chartWidth / sellerData.length)) + (chartWidth / sellerData.length - barWidth) / 2
          const barHeight = (data.count / maxValue) * chartHeight
          const y = padding.top + chartHeight - barHeight

          return (
            <g key={data.name}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#3B82F6"
                className="cursor-pointer transition-all"
                onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, text: `${data.name}: ${data.count}` })}
                onMouseLeave={() => setHover(null)}
              />
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="9"
                fill="#64748B"
                className="pointer-events-none"
                transform={`rotate(-45 ${x + barWidth / 2} ${height - 10})`}
              >
                {data.name.length > 12 ? data.name.slice(0, 12) + '...' : data.name}
              </text>
            </g>
          )
        })}
      </svg>
      {hover && (
        <div
          className="fixed z-50 px-2 py-1 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded shadow-sm pointer-events-none"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          {hover.text}
        </div>
      )}
    </div>
  )
}

/**
 * Sales Line Chart - shows total sales over time
 */
function SalesLineChart({ orders, year }: { orders: AdminOrder[]; year: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const data = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize monthly sales
    const monthlySales: Record<number, number> = {}
    for (let m = 0; m < 12; m++) {
      monthlySales[m] = 0
    }

    // Sum sales by month
    orders.forEach((order) => {
      if (!order.created_at) return
      const orderDate = new Date(order.created_at)
      if (isNaN(orderDate.getTime()) || orderDate.getFullYear() !== year) return
      if (order.status === 'delivered') {
        const month = orderDate.getMonth()
        monthlySales[month] += order.total
      }
    })

    return monthNames.map((label, idx) => ({
      label,
      month: idx,
      value: monthlySales[idx]
    }))
  }, [orders, year])

  const maxValue = Math.max(...data.map(d => d.value), 1)
  
  const width = 720
  const height = 230
  const padding = { top: 12, right: 24, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const pathPoints = data.map((point, idx) => {
    const x = padding.left + (idx / (data.length - 1)) * chartWidth
    const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight
    return { x, y, value: point.value, label: point.label }
  })

  const path = pathPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <div className="h-full flex flex-col relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid lines and Y-axis */}
        {[1, 0.75, 0.5, 0.25, 0].map((tick, i) => {
          const y = padding.top + chartHeight - tick * chartHeight
          const value = Math.round(maxValue * tick)
          const formattedValue = value >= 1000 ? `₱${(value / 1000).toFixed(0)}k` : `₱${value}`
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#DBEAFE"
                strokeWidth="1"
              />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#64748B">
                {formattedValue}
              </text>
            </g>
          )
        })}

        {/* Line and points */}
        <path d={path} fill="none" stroke="#10B981" strokeWidth="2" />
        {pathPoints.map((point, idx) => (
          <g
            key={idx}
            className="cursor-pointer"
            onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, text: `${point.label}: ₱${point.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}` })}
            onMouseLeave={() => setHover(null)}
          >
            <circle cx={point.x} cy={point.y} r="3" fill="#10B981" />
          </g>
        ))}

        {/* X-axis labels */}
        {pathPoints.map((point, idx) => (
          <text
            key={`label-${idx}`}
            x={point.x}
            y={height - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#64748B"
          >
            {point.label}
          </text>
        ))}
      </svg>
      {hover && (
        <div
          className="fixed z-50 px-2 py-1 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded shadow-sm pointer-events-none"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          {hover.text}
        </div>
      )}
    </div>
  )
}

/**
 * Order Calendar Chart - shows daily order counts in calendar format
 */
function OrderCalendarChart({
  year,
  month,
  orders,
  variant = 'compact',
}: {
  year: number
  month: number
  orders: AdminOrder[]
  variant?: 'compact' | 'expanded'
}) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const ordersByDay = useMemo(() => {
    const daysMap: Record<number, number> = {}
    const daysData: Record<number, { day: number | null; count: number; isFuture?: boolean }> = {}
    const today = new Date()
    const isCurrentMonthYear = today.getFullYear() === year && today.getMonth() + 1 === month

    orders.forEach((order) => {
      if (order.created_at) {
        const orderDate = new Date(order.created_at)
        if (!isNaN(orderDate.getTime()) && orderDate.getFullYear() === year && orderDate.getMonth() + 1 === month) {
          const day = orderDate.getDate()
          daysMap[day] = (daysMap[day] || 0) + 1
        }
      }
    })

    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    for (let i = 0; i < startingDayOfWeek; i++) {
      daysData[Object.keys(daysData).length] = { day: null, count: 0 }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isFuture = isCurrentMonthYear && day > today.getDate()
      const count = isFuture ? 0 : (daysMap[day] || 0)
      daysData[Object.keys(daysData).length] = { day, count, isFuture }
    }

    return Object.values(daysData)
  }, [year, month, orders])

  const maxCount = Math.max(...ordersByDay.map((d) => d.count), 1)
  const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' })

  const isExpanded = variant === 'expanded'
  const headerTextClass = isExpanded ? 'text-xs' : 'text-[10px]'
  const headerGapClass = isExpanded ? 'gap-1' : 'gap-0.5'
  const headerMarginClass = isExpanded ? 'mb-1' : 'mb-0.5'
  const cellHeightClass = isExpanded ? 'h-12' : 'h-8'
  const cellTextClass = isExpanded ? 'text-xs' : 'text-[9px]'
  const dayTextClass = isExpanded ? 'text-[10px]' : 'text-[8px]'
  const countTextClass = isExpanded ? 'text-[9px]' : 'text-[7px]'
  const legendTextClass = isExpanded ? 'text-xs' : 'text-[9px]'
  const legendGapClass = isExpanded ? 'gap-1.5' : 'gap-0.5'
  const legendBoxClass = isExpanded ? 'w-4 h-4' : 'w-2.5 h-2.5'

  return (
    <div className="space-y-2 h-full flex flex-col relative">
      <div className={`${headerTextClass} text-slate-600`}>
        {monthName} {year}
      </div>
      <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
        <div className={`grid grid-cols-7 ${headerGapClass} ${headerTextClass} text-slate-600 font-semibold ${headerMarginClass}`}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
            <div key={`${d}-${idx}`} className="text-center">{d}</div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${headerGapClass}`}>
          {ordersByDay.map((dayData, idx) => {
            const intensity = dayData.day !== null && dayData.count > 0 ? dayData.count / maxCount : 0
            const bgColor =
              dayData.day === null ? 'bg-slate-50'
              : dayData.isFuture ? 'bg-slate-50 text-slate-400'
              : intensity > 0.7 ? 'bg-blue-600 text-white'
              : intensity > 0.4 ? 'bg-blue-400 text-white'
              : intensity > 0 ? 'bg-blue-200 text-blue-900'
              : 'bg-blue-50 text-slate-600'

            return (
              <div
                key={idx}
                className={`${cellHeightClass} cursor-pointer relative flex items-center justify-center font-medium rounded border border-blue-200 ${cellTextClass} ${bgColor} transition-colors`}
                onMouseMove={(e) => dayData.day !== null && !dayData.isFuture && dayData.count > 0 ? setHover({ x: e.clientX, y: e.clientY, text: `Orders: ${dayData.count}` }) : null}
                onMouseLeave={() => setHover(null)}
              >
                {dayData.day !== null && !dayData.isFuture && dayData.count > 0 ? (
                  <div className="text-center">
                    <div className={dayTextClass}>{dayData.day}</div>
                    <div className={`${countTextClass} font-bold`}>{dayData.count}</div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      <div className={`${legendTextClass} text-slate-500 flex items-center ${legendGapClass} justify-center flex-shrink-0`}>
        <span>Less</span>
        {[0, 0.3, 0.6, 1].map((intensity) => (
          <div
            key={intensity}
            className={`${legendBoxClass} rounded border border-blue-200`}
            style={{
              backgroundColor:
                intensity === 0 ? '#EFF6FF'
                : intensity < 0.5 ? '#BFDBFE'
                : intensity < 0.8 ? '#60A5FA'
                : '#2563EB',
            }}
          />
        ))}
        <span>More</span>
      </div>
      {hover && (
        <div
          className="fixed z-50 px-2 py-1 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded shadow-sm pointer-events-none"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          {hover.text}
        </div>
      )}
    </div>
  )
}

export default function AdminOrdersPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  const [stats, setStats] = useState<AdminOrdersStats | null>(null)
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([])
  const [sellers, setSellers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [sellerFilter, setSellerFilter] = useState<FilterSeller>('all')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const [detailModal, setDetailModal] = useState<{ order: AdminOrder | null; open: boolean }>({ order: null, open: false })
  const [detailLoading, setDetailLoading] = useState(false)
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetail | null>(null)
  
  // Graph state
  const [graphType, setGraphType] = useState<'seller' | 'sales' | 'calendar'>('seller')
  const [graphYear, setGraphYear] = useState(currentYear)
  const [graphMonth, setGraphMonth] = useState(currentMonth)
  const [showGraphModal, setShowGraphModal] = useState(false)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, ordersRes] = await Promise.all([getAdminOrdersStats(), getAdminOrders(1, 500)])

      setStats(statsRes.stats)
      setAllOrders(ordersRes.orders)

      // Extract unique sellers
      const uniqueSellers = Array.from(new Set(ordersRes.orders.map((o) => o.seller_name)))

      setSellers(uniqueSellers.sort())
    } catch (error) {
      console.error('Failed to load orders data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    let filtered = allOrders
      .filter((o) => statusFilter === 'all' || o.status === statusFilter)
      .filter((o) => sellerFilter === 'all' || o.seller_name === sellerFilter)
      .filter(
        (o) =>
          searchQuery === '' ||
          o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.seller_name.toLowerCase().includes(searchQuery.toLowerCase())
      )

    return filtered
  }, [allOrders, searchQuery, statusFilter, sellerFilter])

  // Split data based on active filters
  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, AdminOrder[]> = {
      pending: [],
      confirmed: [],
      shipped: [],
      delivered: [],
      cancelled: [],
    }

    filteredOrders.forEach((order) => {
      grouped[order.status].push(order)
    })

    return grouped
  }, [filteredOrders])

  const ordersBySeller = useMemo(() => {
    if (sellerFilter === 'all') {
      const grouped: Record<string, AdminOrder[]> = {}
      sellers.forEach((seller) => {
        grouped[seller] = filteredOrders.filter((o) => o.seller_name === seller)
      })
      return grouped
    }
    return {}
  }, [filteredOrders, sellers, sellerFilter])

  // Analytics KPIs
  const analyticsKPIs = useMemo(() => {
    const totalOrders = allOrders.length
    
    // Total sales (delivered orders only)
    const totalSales = allOrders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + order.total, 0)
    
    // Seller with most sales
    const sellerSales: Record<string, number> = {}
    allOrders.forEach((order) => {
      if (order.status === 'delivered') {
        sellerSales[order.seller_name] = (sellerSales[order.seller_name] || 0) + order.total
      }
    })
    const topSellerEntry = Object.entries(sellerSales).sort((a, b) => b[1] - a[1])[0]
    const topSeller = topSellerEntry ? `${topSellerEntry[0]} (₱${topSellerEntry[1].toLocaleString('en-US', { maximumFractionDigits: 0 })})` : 'N/A'
    
    // Most ordered product (we'll need to look at order details, but for now just use a placeholder)
    // Since we don't have product info readily available in order list, we'll show most active buyer
    const buyerCounts: Record<string, number> = {}
    allOrders.forEach((order) => {
      buyerCounts[order.buyer_name] = (buyerCounts[order.buyer_name] || 0) + 1
    })
    const topBuyerEntry = Object.entries(buyerCounts).sort((a, b) => b[1] - a[1])[0]
    const topBuyer = topBuyerEntry ? `${topBuyerEntry[0]} (${topBuyerEntry[1]} orders)` : 'N/A'

    return [
      { label: 'Total Orders', value: totalOrders.toString() },
      { label: 'Total Sales', value: `₱${totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
      { label: 'Top Seller', value: topSeller },
      { label: 'Most Active Buyer', value: topBuyer },
    ]
  }, [allOrders])

  const isFiltered = statusFilter !== 'all' || sellerFilter !== 'all' || searchQuery.trim().length > 0

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids))
  }

  const handleViewOrder = async (order: AdminOrder) => {
    setDetailModal({ ...detailModal, open: true, order })
    setDetailLoading(true)
    try {
      const res = await getAdminOrderDetail(order.id)
      setOrderDetail(res.order)
    } catch (error) {
      console.error('Failed to load order detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-6 w-full min-h-screen">
        <PageTitleHero
          title="Order Management"
          subtitle="View and manage all customer orders"
          backgroundImage="/assets/page-hero/orders.jpg"
        />
        <div className="flex items-center justify-center h-64 text-slate-500">Loading...</div>
      </div>
    )
  }

  const hasActiveFilter = statusFilter !== 'all' || sellerFilter !== 'all'

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Page Hero */}
      <PageTitleHero
        title="Order Management"
        subtitle="View and manage all customer orders"
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* Analytics Section - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 4 KPIs in 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4 lg:items-start">
          {/* Total Orders */}
          <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-blue-700">Total Orders</div>
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{analyticsKPIs[0].value}</div>
            <div className="text-xs text-blue-600 mt-2">All orders</div>
          </div>

          {/* Total Sales */}
          <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-green-700">Total Sales</div>
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{analyticsKPIs[1].value}</div>
            <div className="text-xs text-green-600 mt-2">Delivered revenue</div>
          </div>

          {/* Top Seller */}
          <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-purple-700">Top Seller</div>
              <Store className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-600">{analyticsKPIs[2].value}</div>
            <div className="text-xs text-purple-600 mt-2">Best performer</div>
          </div>

          {/* Most Active Buyer */}
          <div className="bg-gradient-to-br from-white to-orange-50 border border-orange-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-orange-700">Most Active Buyer</div>
              <UserCheck className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-lg font-bold text-orange-600">{analyticsKPIs[3].value}</div>
            <div className="text-xs text-orange-600 mt-2">Top customer</div>
          </div>
        </div>

        {/* Right: Order Analytics - Combined Graph Card */}
        <div className="lg:col-span-2 bg-white border border-blue-200 shadow-md rounded-lg p-3 max-h-[300px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-blue-900">Order Analytics</h3>
            <button
              onClick={() => setShowGraphModal(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 transition-colors border border-blue-300 rounded"
              title="Expand view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Graph Type Toggle + Filter Controls */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <button
              onClick={() => setGraphType('seller')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'seller'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <BarChart3 className="w-3 h-3 inline mr-0.5" />
              Top Sellers
            </button>
            <button
              onClick={() => setGraphType('sales')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'sales'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <DollarSign className="w-3 h-3 inline mr-0.5" />
              Sales Trend
            </button>
            <button
              onClick={() => setGraphType('calendar')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'calendar'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <Calendar className="w-3 h-3 inline mr-0.5" />
              Order Calendar
            </button>
            {/* Year Filter */}
            <select
              value={graphYear}
              onChange={(e) => setGraphYear(Number(e.target.value))}
              className="px-1.5 py-1 border border-blue-300 bg-white text-xs rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {graphType === 'calendar' && (
              <select
                value={graphMonth}
                onChange={(e) => setGraphMonth(Number(e.target.value))}
                className="px-1.5 py-1 border border-blue-300 bg-white text-xs rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {[
                  { val: 1, name: 'January' }, { val: 2, name: 'February' }, { val: 3, name: 'March' },
                  { val: 4, name: 'April' }, { val: 5, name: 'May' }, { val: 6, name: 'June' },
                  { val: 7, name: 'July' }, { val: 8, name: 'August' }, { val: 9, name: 'September' },
                  { val: 10, name: 'October' }, { val: 11, name: 'November' }, { val: 12, name: 'December' },
                ].map((m) => (
                  <option key={m.val} value={m.val}>{m.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Graph Display */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-500">Loading...</div>
            ) : graphType === 'seller' ? (
              <div className="h-64">
                <SellerSalesBarChart orders={isFiltered ? filteredOrders : allOrders} />
              </div>
            ) : graphType === 'sales' ? (
              <div className="h-64">
                <SalesLineChart orders={isFiltered ? filteredOrders : allOrders} year={graphYear} />
              </div>
            ) : (
              <div className="h-64">
                <OrderCalendarChart year={graphYear} month={graphMonth} orders={isFiltered ? filteredOrders : allOrders} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
          <input
            type="text"
            placeholder="Search order #, buyer, seller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-blue-300 bg-white text-base focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="px-3 py-2.5 border border-blue-300 bg-white text-base min-w-[120px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <select
          value={sellerFilter}
          onChange={(e) => setSellerFilter(e.target.value as FilterSeller)}
          className="px-3 py-2.5 border border-blue-300 bg-white text-base min-w-[140px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Sellers</option>
          {sellers.map((seller) => (
            <option key={seller} value={seller}>
              {seller}
            </option>
          ))}
        </select>
      </div>

      {/* Tables Section */}
      <div className="space-y-4">
        {hasActiveFilter ? (
          /* Split View - Filtered & Others */
          <>
            {/* Filtered Orders */}
              <div
                className="transition-all duration-500 ease-in-out"
              >
                <OrdersTable
                  orders={filteredOrders}
                  title={
                    statusFilter !== 'all'
                      ? `Orders: ${statusLabels[statusFilter]}`
                      : `Orders: ${sellerFilter}`
                  }
                  filterType={statusFilter !== 'all' ? 'status' : 'seller'}
                  filterValue={
                    statusFilter !== 'all'
                      ? statusFilter
                      : sellerFilter
                  }
                  isCollapsed={collapsedSections['filtered-orders'] ?? false}
                  onToggleCollapse={() => toggleSection('filtered-orders')}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onViewOrder={handleViewOrder}
              />
            </div>

            {/* Other Orders */}
            {filteredOrders.length < allOrders.length && (
              <div className="transition-all duration-500 ease-in-out">
                <OrdersTable
                  orders={allOrders.filter(
                    (o) =>
                      !(
                        (statusFilter !== 'all' && o.status === statusFilter) ||
                        (sellerFilter !== 'all' && o.seller_name === sellerFilter)
                      )
                  )}
                  title="Other Orders"
                  isCollapsed={collapsedSections['other-orders'] ?? false}
                  onToggleCollapse={() => toggleSection('other-orders')}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onViewOrder={handleViewOrder}
                />
              </div>
            )}
          </>
        ) : (
          /* Default View - By Status */
          <>
            {Object.entries(ordersByStatus).map(([status, orders], index) =>
              orders.length > 0 ? (
                <div
                  key={status}
                  className="transition-all duration-500 ease-in-out"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'slideIn 0.4s ease-out forwards',
                  }}
                >
                  <OrdersTable
                    orders={orders}
                    title={`${statusLabels[status as OrderStatus]}`}
                    filterType="status"
                    filterValue={status}
                    isCollapsed={collapsedSections[`status-${status}`] ?? false}
                    onToggleCollapse={() => toggleSection(`status-${status}`)}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onViewOrder={handleViewOrder}
                  />
                </div>
              ) : null
            )}
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      {detailModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailModal({ order: null, open: false })}
        >
          <div
            className="bg-white w-full max-w-lg border border-black/15 shadow-xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-black/15 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">Order Details</h2>
              <button onClick={() => setDetailModal({ order: null, open: false })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-10 text-center text-slate-500">Loading...</div>
            ) : orderDetail ? (
              <div className="p-5 space-y-5">
                {/* Order Header */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-black/10">
                  <div>
                    <div className="text-sm text-slate-500">Order Number</div>
                    <div className="text-lg font-bold text-slate-900">{orderDetail.order_number}</div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded ${statusColors[orderDetail.status]}`}
                  >
                    {React.createElement(statusIcons[orderDetail.status], { className: 'w-4 h-4' })}
                    {statusLabels[orderDetail.status]}
                  </span>
                </div>

                {/* Buyer & Seller Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-black/10">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700">
                      {orderDetail.buyer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Buyer</div>
                      <div className="text-sm font-medium text-slate-900">{orderDetail.buyer_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-black/10">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-medium text-purple-700">
                      {orderDetail.seller_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Seller</div>
                      <div className="text-sm font-medium text-slate-900">{orderDetail.seller_name}</div>
                    </div>
                  </div>
                </div>

                {/* Order Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-black/10">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Total Amount</div>
                      <div className="text-sm font-bold text-slate-900">
                        ₱{orderDetail.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-black/10">
                    <Package className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Items</div>
                      <div className="text-sm font-bold text-slate-900">{orderDetail.total_items}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-black/10">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Order Date</div>
                      <div className="text-sm font-medium text-slate-900">{formatDate(orderDetail.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-black/10">
                    <ShoppingCart className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Category</div>
                      <div className="text-sm font-medium text-slate-900">{orderDetail.category}</div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <div className="text-sm font-bold text-slate-900 mb-2">Order Items</div>
                  <div className="border border-black/10">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-black/10">
                        <tr>
                          <th className="text-left px-3 py-2 font-bold">Product</th>
                          <th className="text-right px-3 py-2 font-bold">Qty</th>
                          <th className="text-right px-3 py-2 font-bold">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/10">
                        {orderDetail.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="text-right px-3 py-2">{item.qty}</td>
                            <td className="text-right px-3 py-2 font-medium">
                              ₱{item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <div className="text-sm font-bold text-slate-900 mb-2">Shipping Address</div>
                  <div className="p-3 bg-slate-50 border border-black/10 text-sm text-slate-700 space-y-1">
                    <div>
                      <strong>{orderDetail.address.full_name}</strong>
                    </div>
                    <div>{orderDetail.address.address_line}</div>
                    <div>
                      {orderDetail.address.city}, {orderDetail.address.province} {orderDetail.address.postal_code}
                    </div>
                    {orderDetail.address.notes && (
                      <div className="text-xs text-slate-600">{orderDetail.address.notes}</div>
                    )}
                    <div className="pt-2 border-t border-black/10">
                      <Phone className="w-4 h-4 inline-block mr-1" />
                      {orderDetail.address.phone}
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="p-3 bg-blue-50 border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium">Payment Method</div>
                  <div className="text-sm font-medium text-blue-900">{orderDetail.payment_method}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Expandable Graph Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-blue-200 bg-white">
              <div>
                <h3 className="text-lg font-bold text-blue-900">
                  {graphType === 'seller' ? 'Top Sellers Distribution' : graphType === 'sales' ? 'Sales Trend Over Time' : 'Order Calendar'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {graphType === 'calendar' ? `${new Date(graphYear, graphMonth - 1).toLocaleString('en-US', { month: 'long' })} ${graphYear}` : `Year ${graphYear}`}
                </p>
              </div>
              <button
                onClick={() => setShowGraphModal(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 flex-wrap">
                {/* Graph Type Toggle */}
                <button
                  onClick={() => setGraphType('seller')}
                  className={`px-3 py-1.5 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'seller'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-1" />
                  Top Sellers
                </button>
                <button
                  onClick={() => setGraphType('sales')}
                  className={`px-3 py-1.5 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'sales'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Sales Trend
                </button>
                <button
                  onClick={() => setGraphType('calendar')}
                  className={`px-3 py-1.5 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'calendar'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Order Calendar
                </button>

                <select
                  value={graphYear}
                  onChange={(e) => setGraphYear(parseInt(e.target.value))}
                  className="px-2 py-1 border border-black shadow-md bg-white text-xs font-semibold rounded"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {graphType === 'calendar' && (
                  <select
                    value={graphMonth}
                    onChange={(e) => setGraphMonth(parseInt(e.target.value))}
                    className="px-2 py-1 border border-black shadow-md bg-white text-xs font-semibold rounded"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {loading ? (
                <div className="h-96 flex items-center justify-center text-sm text-slate-500">Loading...</div>
              ) : (
                <div className="h-96">
                  {graphType === 'seller' ? (
                    <SellerSalesBarChart orders={isFiltered ? filteredOrders : allOrders} />
                  ) : graphType === 'sales' ? (
                    <SalesLineChart orders={isFiltered ? filteredOrders : allOrders} year={graphYear} />
                  ) : (
                    <OrderCalendarChart year={graphYear} month={graphMonth} orders={isFiltered ? filteredOrders : allOrders} variant="expanded" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
