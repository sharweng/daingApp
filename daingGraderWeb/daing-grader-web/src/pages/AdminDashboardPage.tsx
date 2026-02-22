/**
 * Admin Dashboard - sharp-corner layout inspired by the provided reference.
 * Uses backend scan data for the graph + table.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart2,
  Users,
  ScanLine,
  Database,
  MessageCircle,
  ShoppingBag,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingCart,
  Maximize2,
  X,
} from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminScanPage,
  getAdminScanSummary,
  getMostLikedPosts,
  getAdminOrdersStats,
  getAdminOrdersByTime,
  type AdminScanEntry,
  type AdminScanMonthSummary,
  type AdminOrdersStats,
  type OrdersByTimeResponse,
} from '../services/api'

interface TopPost {
  id: string
  title: string
  likes: number
  author_name: string
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [year, setYear] = useState(currentYear)
  const [range, setRange] = useState<'12m' | '6m'>('12m')
  const [halfYear, setHalfYear] = useState<'H1' | 'H2'>('H1') // H1 = Jan-Jun, H2 = Jul-Dec
  const [summary, setSummary] = useState<AdminScanMonthSummary[]>([])
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // KPI stats from backend
  const [orderStats, setOrderStats] = useState<AdminOrdersStats | null>(null)
  const [orderStatsLoading, setOrderStatsLoading] = useState(true)

  // Orders by time (heat map)
  const [heatMapYear, setHeatMapYear] = useState(currentYear)
  const [heatMapMonth, setHeatMapMonth] = useState(currentMonth)
  const [ordersByTime, setOrdersByTime] = useState<OrdersByTimeResponse | null>(null)
  const [ordersByTimeLoading, setOrdersByTimeLoading] = useState(true)

  // Most liked posts from backend
  const [topPosts, setTopPosts] = useState<TopPost[]>([])
  const [topPostsLoading, setTopPostsLoading] = useState(true)

  const [page, setPage] = useState(1)
  const pageSize = 10
  const [tableEntries, setTableEntries] = useState<AdminScanEntry[]>([])
  const [tableTotal, setTableTotal] = useState(0)
  const [tableLoading, setTableLoading] = useState(true)
  const [tableError, setTableError] = useState<string | null>(null)
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [showHeatMapModal, setShowHeatMapModal] = useState(false)
  const [showScansModal, setShowScansModal] = useState(false)

  useEffect(() => {
    setTopPostsLoading(true)
    getMostLikedPosts(4)
      .then((data) => setTopPosts(data.posts || []))
      .catch(() => setTopPosts([]))
      .finally(() => setTopPostsLoading(false))
  }, [])

  // Fetch KPI stats
  useEffect(() => {
    setOrderStatsLoading(true)
    getAdminOrdersStats()
      .then((data) => setOrderStats(data.stats || null))
      .catch(() => setOrderStats(null))
      .finally(() => setOrderStatsLoading(false))
  }, [])

  // Fetch orders by time for heat map
  useEffect(() => {
    setOrdersByTimeLoading(true)
    getAdminOrdersByTime(heatMapYear, heatMapMonth)
      .then((data) => setOrdersByTime(data))
      .catch(() => setOrdersByTime(null))
      .finally(() => setOrdersByTimeLoading(false))
  }, [heatMapYear, heatMapMonth])

  useEffect(() => {
    setSummaryLoading(true)
    setSummaryError(null)
    getAdminScanSummary(year)
      .then((data) => {
        setSummary(data.months || [])
      })
      .catch(() => setSummaryError('Failed to load scan summary'))
      .finally(() => setSummaryLoading(false))
  }, [year])

  useEffect(() => {
    setTableLoading(true)
    setTableError(null)
    getAdminScanPage(page, pageSize)
      .then((data) => {
        setTableEntries(data.entries || [])
        setTableTotal(data.total || 0)
      })
      .catch(() => setTableError('Failed to load scan table'))
      .finally(() => setTableLoading(false))
  }, [page])

  const monthsForChart = useMemo(() => {
    const safe = summary.length ? summary : []
    if (range === '6m') {
      return halfYear === 'H1' ? safe.slice(0, 6) : safe.slice(6, 12)
    }
    return safe
  }, [summary, range, halfYear])

  const chartPoints = useMemo(() => {
    const width = 600
    const height = 200
    const padding = 20
    const counts = monthsForChart.map((m) => m.count)
    const maxCount = Math.max(1, ...counts)
    const stepX = counts.length > 1 ? (width - padding * 2) / (counts.length - 1) : 0
    const points = counts.map((count, i) => {
      const x = padding + i * stepX
      const y = padding + (height - padding * 2) * (1 - count / maxCount)
      return `${x},${y}`
    })
    return { points: points.join(' '), width, height, padding, maxCount }
  }, [monthsForChart])

  const totalPages = Math.max(1, Math.ceil(tableTotal / pageSize))
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '—'
    const d = new Date(timestamp)
    if (Number.isNaN(d.getTime())) return timestamp
    return d.toISOString().slice(0, 10)
  }

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Page Hero */}
      <PageTitleHero
        title="Admin Dashboard"
        subtitle="Manage your platform, monitor analytics, and oversee all system activities."
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* Dashboard Overview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Welcome Back, {user?.name || 'Admin'}</h2>
          <p className="text-sm text-slate-500">Real-time platform performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border border-slate-200 shadow-md bg-white text-sm font-medium hover:bg-slate-50 transition-colors rounded">
            <Calendar className="w-4 h-4 inline-block mr-2" />
            Date
          </button>
          <button className="px-3 py-2 border border-slate-200 shadow-md bg-white text-sm font-medium hover:bg-slate-50 transition-colors rounded">
            <Download className="w-4 h-4 inline-block mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Sales */}
        <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">Total Sales</div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-blue-900">
            {orderStatsLoading ? '...' : `₱${(orderStats?.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="w-4 h-4" />
            All Sellers
          </div>
        </div>
        
        {/* Avg Order Value */}
        <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">Avg Order Value</div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-blue-900">
            {orderStatsLoading ? '...' : `₱${(orderStats?.avg_order_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
            <BarChart2 className="w-4 h-4" />
            All Sellers
          </div>
        </div>
        
        {/* Total Orders */}
        <div className="bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">Total Orders</div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-blue-900">
            {orderStatsLoading ? '...' : (orderStats?.total_orders || 0).toLocaleString()}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="w-4 h-4" />
            All Sellers
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Orders by time (heat map style) */}
        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-lg relative">
          <div className="flex items-center justify-between mb-3 pr-10">
            <div className="text-lg font-bold text-blue-900">Orders by Time</div>
            <button
              onClick={() => setShowHeatMapModal(true)}
              className="absolute top-4 right-4 p-2 text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200 z-10"
              title="Expand view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          {/* Year and Month filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select
              value={heatMapYear}
              onChange={(e) => setHeatMapYear(Number(e.target.value))}
              className="px-2 py-1 border border-blue-300 shadow-md bg-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={heatMapMonth}
              onChange={(e) => setHeatMapMonth(Number(e.target.value))}
              className="px-2 py-1 border border-blue-300 shadow-md bg-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
            >
              {[
                { val: 1, name: 'Jan' }, { val: 2, name: 'Feb' }, { val: 3, name: 'Mar' },
                { val: 4, name: 'Apr' }, { val: 5, name: 'May' }, { val: 6, name: 'Jun' },
                { val: 7, name: 'Jul' }, { val: 8, name: 'Aug' }, { val: 9, name: 'Sep' },
                { val: 10, name: 'Oct' }, { val: 11, name: 'Nov' }, { val: 12, name: 'Dec' },
              ].map((m) => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>
            <div className="text-xs text-slate-600 ml-auto">
              {ordersByTime ? `0 — ${ordersByTime.max_count}` : '0 — 0'}
            </div>
          </div>
          {ordersByTimeLoading ? (
            <div className="h-32 flex items-center justify-center text-sm text-slate-500">Loading...</div>
          ) : ordersByTime && ordersByTime.weeks ? (
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="text-center">{d}</div>
                ))}
              </div>
              {ordersByTime.weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIdx) => {
                    const maxCount = ordersByTime.max_count || 1
                    const intensity = day.day !== null && day.count > 0 ? Math.min(day.count / maxCount, 1) : 0
                    return (
                      <div
                        key={dayIdx}
                        className={`h-6 border border-slate-200 flex items-center justify-center text-[9px] font-medium rounded-sm ${
                          day.day === null ? 'bg-slate-50' : 
                          intensity > 0.7 ? 'bg-blue-600 text-white' :
                          intensity > 0.4 ? 'bg-blue-400 text-white' :
                          intensity > 0 ? 'bg-blue-200 text-blue-900' :
                          'bg-blue-50 text-slate-400'
                        }`}
                        title={day.day !== null ? `Day ${day.day}: ${day.count} orders (₱${day.total.toLocaleString()})` : ''}
                      >
                        {day.day !== null ? day.count || '' : ''}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-sm text-slate-500">No data</div>
          )}
        </div>

        {/* Number of scans (backend-driven chart) */}
        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-4 lg:col-span-2 rounded-lg relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3 pr-10">
            <div className="text-lg font-bold text-blue-900">Number of Scans</div>
            <button
              onClick={() => setShowScansModal(true)}
              className="absolute top-4 right-4 p-2 text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200 z-10"
              title="Expand view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-2 py-1 border border-blue-300 shadow-md bg-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
                aria-label="Select year"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="flex border border-blue-300 shadow-md rounded">
                <button
                  type="button"
                  onClick={() => setRange('12m')}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${range === '12m' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                >
                  12 Months
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (range === '6m') {
                      // Toggle between H1 and H2
                      setHalfYear(halfYear === 'H1' ? 'H2' : 'H1')
                    } else {
                      setRange('6m')
                      setHalfYear('H1')
                    }
                  }}
                  className={`px-3 py-1 text-xs font-semibold border-l border-blue-300 transition-colors ${range === '6m' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                >
                  6 Months{range === '6m' ? (halfYear === 'H1' ? ' (Jan-Jun)' : ' (Jul-Dec)') : ''}
                </button>
              </div>
            </div>
          </div>

          {summaryLoading ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-500">Loading chart…</div>
          ) : summaryError ? (
            <div className="h-48 flex items-center justify-center text-sm text-red-600">{summaryError}</div>
          ) : (
            <div>
              <div className="relative w-full h-48">
                <svg viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`} preserveAspectRatio="none" className="w-full h-full">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = chartPoints.padding + (i * (chartPoints.height - chartPoints.padding * 2)) / 4
                    return (
                      <line
                        key={`h-${i}`}
                        x1={chartPoints.padding}
                        y1={y}
                        x2={chartPoints.width - chartPoints.padding}
                        y2={y}
                        stroke="#E2E8F0"
                      />
                    )
                  })}

                  {monthsForChart.map((_, i) => {
                    const stepX = monthsForChart.length > 1
                      ? (chartPoints.width - chartPoints.padding * 2) / (monthsForChart.length - 1)
                      : 0
                    const x = chartPoints.padding + i * stepX
                    return (
                      <line
                        key={`v-${i}`}
                        x1={x}
                        y1={chartPoints.padding}
                        x2={x}
                        y2={chartPoints.height - chartPoints.padding}
                        stroke="#E2E8F0"
                      />
                    )
                  })}

                  <polyline
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    points={chartPoints.points}
                  />
                  {chartPoints.points.split(' ').map((p, idx) => {
                    const [x, y] = p.split(',')
                    const isHovered = hoveredPointIndex === idx
                    return (
                      <g
                        key={`p-${idx}`}
                        onMouseEnter={(e) => {
                          setHoveredPointIndex(idx)
                          const svg = e.currentTarget.closest('svg')
                          if (svg) {
                            const rect = svg.getBoundingClientRect()
                            const svgX = (Number(x) / chartPoints.width) * rect.width
                            const svgY = (Number(y) / chartPoints.height) * rect.height
                            setTooltipPos({ x: rect.left + svgX, y: rect.top + svgY - 50 })
                          }
                        }}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? '5' : '3'}
                          fill={isHovered ? '#1E40AF' : '#3B82F6'}
                          className="transition-all duration-150"
                        />
                      </g>
                    )
                  })}
                </svg>
                
                {hoveredPointIndex !== null && monthsForChart[hoveredPointIndex] && (
                  <div
                    className="fixed bg-slate-800 text-white px-3 py-2 rounded text-xs whitespace-nowrap shadow-lg pointer-events-none z-50"
                    style={{
                      left: tooltipPos.x,
                      top: tooltipPos.y,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="font-semibold">{monthsForChart[hoveredPointIndex].label}</div>
                    <div>{monthsForChart[hoveredPointIndex].count} scans</div>
                  </div>
                )}
              </div>
            </div>
            )}
        </div>
      </div>

      {/* Heat Map Modal */}
      {showHeatMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl rounded-lg">
            <div className="flex items-center justify-between p-4 border-b border-blue-200">
              <h3 className="text-lg font-bold text-blue-900">Orders by Time - {ordersByTime?.month_name} {heatMapYear}</h3>
              <button
                onClick={() => setShowHeatMapModal(false)}
                className="p-1 hover:bg-slate-100 transition-colors rounded"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                  value={heatMapYear}
                  onChange={(e) => setHeatMapYear(Number(e.target.value))}
                  className="px-3 py-2 border border-blue-300 shadow-md bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={heatMapMonth}
                  onChange={(e) => setHeatMapMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-blue-300 shadow-md bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded"
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
                <div className="text-sm text-slate-600 ml-auto">
                  Max: {ordersByTime?.max_count || 0} orders/day
                </div>
              </div>
              
              {ordersByTimeLoading ? (
                <div className="h-48 flex items-center justify-center text-sm text-slate-500">Loading...</div>
              ) : ordersByTime && ordersByTime.weeks ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-2 text-sm text-slate-500">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                      <div key={d} className="text-center font-semibold">{d}</div>
                    ))}
                  </div>
                  {ordersByTime.weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 gap-2">
                      {week.map((day, dayIdx) => {
                        const maxCount = ordersByTime.max_count || 1
                        const intensity = day.day !== null && day.count > 0 ? Math.min(day.count / maxCount, 1) : 0
                        return (
                          <div
                            key={dayIdx}
                            className={`h-16 border border-slate-200 flex flex-col items-center justify-center text-xs font-semibold rounded ${
                              day.day === null ? 'bg-slate-50' : 
                              intensity > 0.7 ? 'bg-blue-600 text-white' :
                              intensity > 0.4 ? 'bg-blue-400 text-white' :
                              intensity > 0 ? 'bg-blue-200 text-blue-900' :
                              'bg-blue-50 text-slate-400'
                            }`}
                          >
                            {day.day !== null && (
                              <>
                                <span className="text-[10px] opacity-70">Day {day.day}</span>
                                <span className="text-sm font-bold">{day.count}</span>
                                {day.total > 0 && <span className="text-[9px] opacity-80">₱{day.total.toLocaleString()}</span>}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-slate-500">No data for this period</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scans Chart Modal */}
      {showScansModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-blue-200">
              <h3 className="text-lg font-bold text-blue-900">Number of Scans</h3>
              <button
                onClick={() => setShowScansModal(false)}
                className="p-1 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2 border border-blue-300 shadow-md bg-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="flex border border-blue-300 shadow-md rounded">
                  <button
                    type="button"
                    onClick={() => setRange('12m')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${range === '12m' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                  >
                    12 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (range === '6m') {
                        setHalfYear(halfYear === 'H1' ? 'H2' : 'H1')
                      } else {
                        setRange('6m')
                        setHalfYear('H1')
                      }
                    }}
                    className={`px-4 py-2 text-sm font-semibold border-l border-blue-300 transition-colors ${range === '6m' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                  >
                    6 Months{range === '6m' ? (halfYear === 'H1' ? ' (Jan-Jun)' : ' (Jul-Dec)') : ''}
                  </button>
                </div>
              </div>

              {summaryLoading ? (
                <div className="h-96 flex items-center justify-center text-sm text-slate-500">Loading chart…</div>
              ) : summaryError ? (
                <div className="h-96 flex items-center justify-center text-sm text-red-600">{summaryError}</div>
              ) : (
                <div>
                  <div className="relative w-full h-96">
                    <svg viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`} preserveAspectRatio="none" className="w-full h-full">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const y = chartPoints.padding + (i * (chartPoints.height - chartPoints.padding * 2)) / 4
                        return (
                          <line
                            key={`h-${i}`}
                            x1={chartPoints.padding}
                            y1={y}
                            x2={chartPoints.width - chartPoints.padding}
                            y2={y}
                            stroke="#E2E8F0"
                          />
                        )
                      })}

                      {monthsForChart.map((_, i) => {
                        const stepX = monthsForChart.length > 1
                          ? (chartPoints.width - chartPoints.padding * 2) / (monthsForChart.length - 1)
                          : 0
                        const x = chartPoints.padding + i * stepX
                        return (
                          <line
                            key={`v-${i}`}
                            x1={x}
                            y1={chartPoints.padding}
                            x2={x}
                            y2={chartPoints.height - chartPoints.padding}
                            stroke="#E2E8F0"
                          />
                        )
                      })}

                      <polyline
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        points={chartPoints.points}
                      />
                      {chartPoints.points.split(' ').map((p, idx) => {
                        const [x, y] = p.split(',')
                        return (
                          <circle
                            key={`p-${idx}`}
                            cx={x}
                            cy={y}
                            r="6"
                            fill="#3B82F6"
                          />
                        )
                      })}
                    </svg>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 mt-4">
                    {monthsForChart.map((m) => (
                      <span key={m.key} className="font-semibold">{m.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table + Community highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-4 lg:col-span-2 rounded-lg">
          <div className="text-lg font-bold text-blue-900 mb-3">Results of Scans</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-700 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
                <tr>
                  <th className="text-left py-3 px-2 font-bold text-blue-900">Fish Type</th>
                  <th className="text-left py-3 px-2 font-bold text-blue-900">Detection</th>
                  <th className="text-left py-3 px-2 font-bold text-blue-900">Grade</th>
                  <th className="text-left py-3 px-2 font-bold text-blue-900">Score</th>
                  <th className="text-left py-3 px-2 font-bold text-blue-900">User</th>
                  <th className="text-left py-3 px-2 font-bold text-blue-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-600">Loading scans…</td>
                  </tr>
                ) : tableError ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-red-600">{tableError}</td>
                  </tr>
                ) : tableEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-600">No scans found</td>
                  </tr>
                ) : (
                  tableEntries.map((row) => (
                    <tr key={row.id} className="border-b border-slate-200">
                      <td className="py-2">{row.fish_type || 'Unknown'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.detected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.detected ? 'Detected' : 'No Detection'}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 border border-slate-200 shadow-md text-xs font-semibold">
                          {row.grade || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2">{row.score != null ? row.score.toFixed(2) : '—'}</td>
                      <td className="py-2">{row.user_name || 'Unknown'}</td>
                      <td className="py-2">{formatDate(row.timestamp)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-slate-600">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-blue-300 shadow-md bg-white hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-white transition-colors rounded"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-blue-600" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-blue-300 shadow-md bg-white hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-white transition-colors rounded"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-lg">
          <div className="text-lg font-bold text-blue-900 mb-3">Most Liked Community Posts</div>
          <div className="space-y-3">
            {topPostsLoading ? (
              <div className="text-sm text-slate-600 text-center py-4">Loading...</div>
            ) : topPosts.length === 0 ? (
              <div className="text-sm text-slate-600 text-center py-4">No posts yet</div>
            ) : (
              topPosts.map((post, idx) => (
                <div key={post.id} className="border border-blue-200 p-3 bg-white rounded hover:shadow transition-shadow">
                  <div className="text-xs text-blue-600 font-semibold">#{idx + 1} • {post.likes} likes</div>
                  <div className="font-semibold text-slate-900 mt-1 line-clamp-2">{post.title}</div>
                  <div className="text-xs text-slate-700 mt-1">by {post.author_name}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <Link to="/forum" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">View Forum →</Link>
          </div>
        </div>
      </div>

    </div>
  )
}
