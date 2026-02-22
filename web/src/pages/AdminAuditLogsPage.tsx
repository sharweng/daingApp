import React, { useEffect, useMemo, useState } from 'react'
import { Filter, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Maximize2, X, Activity, Clock, User, Tag } from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import { getAdminAuditLogs, type AdminAuditLogEntry } from '../services/api'

type AuditCategory = 'Scans' | 'Users' | 'Community' | 'Auth' | 'Comments' | 'Orders'
type AuditStatus = 'success' | 'warning' | 'error'

const categoryOptions: Array<'All' | AuditCategory> = ['All', 'Scans', 'Users', 'Community', 'Auth', 'Comments', 'Orders']
const statusOptions: Array<'All' | AuditStatus> = ['All', 'success', 'warning', 'error']

// Category descriptions for activity labels
const categoryDescriptions: Record<AuditCategory, { title: string; description: string; activities: string[] }> = {
  'Scans': {
    title: 'Scan Activities',
    description: 'Fish scanning and grading actions',
    activities: ['Created fish scan', 'Updated scan grade', 'Disabled scan', 'Enabled scan', 'Deleted scan']
  },
  'Community': {
    title: 'Community Activities',
    description: 'Community posts and interactions',
    activities: ['Created community post', 'Liked post', 'Unliked post', 'Edited post', 'Deleted post']
  },
  'Comments': {
    title: 'Comment Activities',
    description: 'Post comments and replies',
    activities: ['Created comment', 'Replied to comment', 'Edited comment', 'Deleted comment']
  },
  'Users': {
    title: 'User Management Activities',
    description: 'User account and role management',
    activities: ['User registered', 'Updated user role', 'Changed user status', 'Profile updated', 'Account deleted']
  },
  'Auth': {
    title: 'Authentication Activities',
    description: 'Login, signup, and account security events',
    activities: ['User signed in', 'User signed up', 'User signed out', 'Password changed', 'Password reset', 'Email verified', 'Login failed']
  },
  'Orders': {
    title: 'Order & Commerce Activities',
    description: 'E-commerce orders and payment transactions',
    activities: ['Order created', 'Order confirmed', 'Payment processed', 'Payment failed', 'Order shipped', 'Order delivered', 'Order cancelled']
  }
}

// Status explanations
const statusExplanations: Record<AuditStatus, string> = {
  'success': 'Activity completed successfully',
  'warning': 'Activity completed with potential issues or warnings',
  'error': 'Activity failed to complete'
}

const formatDate = (timestamp: string) => {
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return timestamp
  return d.toISOString().slice(0, 10)
}

const formatTime = (timestamp: string) => {
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(11, 19)
}

/**
 * Activity Category Line Chart - shows trends of different activity categories over time
 */
function ActivityCategoryLineChart({ logs, year }: { logs: AdminAuditLogEntry[]; year: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const data = useMemo(() => {
    const categories: AuditCategory[] = ['Scans', 'Users', 'Community', 'Auth', 'Comments', 'Orders']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize data structure: { month: { category: count } }
    const monthlyCounts: Record<number, Record<AuditCategory, number>> = {}
    for (let m = 0; m < 12; m++) {
      monthlyCounts[m] = {} as Record<AuditCategory, number>
      categories.forEach(cat => {
        monthlyCounts[m][cat] = 0
      })
    }

    // Count activities by month and category
    logs.forEach((log) => {
      if (!log.timestamp) return
      const logDate = new Date(log.timestamp)
      if (isNaN(logDate.getTime()) || logDate.getFullYear() !== year) return
      const month = logDate.getMonth()
      if (log.category && categories.includes(log.category as AuditCategory)) {
        monthlyCounts[month][log.category as AuditCategory] += 1
      }
    })

    // Convert to array format for charting
    return categories.map(category => ({
      category,
      points: monthNames.map((label, idx) => ({
        label,
        month: idx,
        value: monthlyCounts[idx][category]
      }))
    }))
  }, [logs, year])

  const categoryColors: Record<AuditCategory, string> = {
    'Scans': '#2563EB',
    'Users': '#60A5FA',
    'Community': '#8B5CF6',
    'Auth': '#10B981',
    'Comments': '#EF4444',
    'Orders': '#F59E0B'
  }

  const allValues = data.flatMap(d => d.points.map(p => p.value))
  const maxValue = Math.max(...allValues, 1)
  
  const width = 720
  const height = 230
  const padding = { top: 12, right: 24, bottom: 40, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col relative min-h-0 w-full">
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

          {/* Lines for each category */}
          {data.map(({ category, points }) => {
            const pathPoints = points.map((point, idx) => {
              const x = padding.left + (idx / (points.length - 1)) * chartWidth
              const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight
              return { x, y, value: point.value, label: point.label }
            })

            const path = pathPoints
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
              .join(' ')

            return (
              <g key={category}>
                <path d={path} fill="none" stroke={categoryColors[category]} strokeWidth="2" />
                {pathPoints.map((point, idx) => (
                  <g
                    key={`${category}-${idx}`}
                    className="cursor-pointer"
                    onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, text: `${category} (${point.label}): ${point.value}` })}
                    onMouseLeave={() => setHover(null)}
                  >
                    <circle cx={point.x} cy={point.y} r="3" fill={categoryColors[category]} />
                  </g>
                ))}
              </g>
            )
          })}

          {/* X-axis labels */}
          {data[0]?.points.map((point, idx) => {
            const x = padding.left + (idx / (data[0].points.length - 1)) * chartWidth
            return (
              <text
                key={`label-${idx}`}
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#64748B"
              >
                {point.label}
              </text>
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
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 flex-wrap mt-2 flex-shrink-0">
        {data.map(({ category }) => (
          <div key={category} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[category] }} />
            <span className="text-xs text-slate-600">{category}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Activity Calendar Chart - shows daily activity counts in calendar format
 */
function ActivityCalendarChart({
  year,
  month,
  logs,
  variant = 'compact',
}: {
  year: number
  month: number
  logs: AdminAuditLogEntry[]
  variant?: 'compact' | 'expanded'
}) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const activitiesByDay = useMemo(() => {
    const daysMap: Record<number, number> = {}
    const daysData: Record<number, { day: number | null; count: number; isFuture?: boolean }> = {}
    const today = new Date()
    const isCurrentMonthYear = today.getFullYear() === year && today.getMonth() + 1 === month

    logs.forEach((log) => {
      if (log.timestamp) {
        const logDate = new Date(log.timestamp)
        if (!isNaN(logDate.getTime()) && logDate.getFullYear() === year && logDate.getMonth() + 1 === month) {
          const day = logDate.getDate()
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
  }, [year, month, logs])

  const maxCount = Math.max(...activitiesByDay.map((d) => d.count), 1)
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
          {activitiesByDay.map((dayData, idx) => {
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
                onMouseMove={(e) => dayData.day !== null && !dayData.isFuture && dayData.count > 0 ? setHover({ x: e.clientX, y: e.clientY, text: `Activities: ${dayData.count}` }) : null}
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
                : '#1E40AF',
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

export default function AdminAuditLogsPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // Graph state
  const [graphType, setGraphType] = useState<'category' | 'calendar'>('category')
  const [graphYear, setGraphYear] = useState(currentYear)
  const [graphMonth, setGraphMonth] = useState(currentMonth)
  const [showGraphModal, setShowGraphModal] = useState(false)
  
  // Legacy chart state (can be removed if not needed elsewhere)
  const [year, setYear] = useState(currentYear)
  const [range, setRange] = useState<'12m' | '6m'>('12m')
  const [halfYear, setHalfYear] = useState<'H1' | 'H2'>('H1')
  
  const [category, setCategory] = useState<'All' | AuditCategory>('All')
  const [status, setStatus] = useState<'All' | AuditStatus>('All')
  const [actorQuery, setActorQuery] = useState('')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [filteredCollapsed, setFilteredCollapsed] = useState(false)
  const [allActivityCollapsed, setAllActivityCollapsed] = useState(false)
  const [chartModalOpen, setChartModalOpen] = useState(false)
  const [allActivityPage, setAllActivityPage] = useState(1)
  const allActivityPageSize = 10

  const loadLogs = () => {
    setLogsLoading(true)
    setLogsError(null)
    getAdminAuditLogs()
      .then((data) => setLogs(data.entries || []))
      .catch(() => setLogsError('Failed to load audit logs'))
      .finally(() => setLogsLoading(false))
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const categoryMatch = category === 'All' || log.category === category
      const statusMatch = status === 'All' || log.status === status
      const actorMatch = actorQuery.trim().length === 0
        || log.actor.toLowerCase().includes(actorQuery.trim().toLowerCase())
      return categoryMatch && statusMatch && actorMatch
    })
  }, [logs, category, status, actorQuery])

  const isFiltered = category !== 'All' || status !== 'All' || actorQuery.trim().length > 0

  // Date range filtering for chart - show only logs within selected range
  const logsForChart = useMemo(() => {
    const base = isFiltered ? filteredLogs : logs
    const now = new Date(year, 11, 31) // Last day of the year
    
    if (range === '6m') {
      const startMonth = halfYear === 'H1' ? 0 : 6
      const startDate = new Date(year, startMonth, 1)
      const endDate = halfYear === 'H1' 
        ? new Date(year, 5, 30) 
        : new Date(year, 11, 31)
      
      return base.filter((log) => {
        const logDate = new Date(log.timestamp)
        return logDate >= startDate && logDate <= endDate
      })
    }
    
    return base.filter((log) => {
      const logDate = new Date(log.timestamp)
      return logDate.getFullYear() === year
    })
  }, [logs, isFiltered, filteredLogs, year, range, halfYear])

  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const generateDates = () => {
      const dates = []
      if (range === '6m') {
        const startMonth = halfYear === 'H1' ? 0 : 6
        const endMonth = halfYear === 'H1' ? 5 : 11
        for (let m = startMonth; m <= endMonth; m++) {
          const monthDate = new Date(year, m, 15)
          const key = monthDate.toISOString().slice(0, 7) // YYYY-MM
          const label = monthNames[m]
          dates.push({ key, label, count: 0 })
        }
      } else {
        // 12 months of the year
        for (let m = 0; m < 12; m++) {
          const monthDate = new Date(year, m, 15)
          const key = monthDate.toISOString().slice(0, 7)
          const label = monthNames[m]
          dates.push({ key, label, count: 0 })
        }
      }
      return dates
    }
    const days = generateDates()

    const index = new Map(days.map((d) => [d.key, d]))
    logsForChart.forEach((log) => {
      const key = range === '6m' || range === '12m' ? formatDate(log.timestamp).slice(0, 7) : formatDate(log.timestamp)
      const entry = index.get(key)
      if (entry) entry.count += 1
    })

    return days
  }, [logsForChart, range, year, halfYear])

  const chartPoints = useMemo(() => {
    const width = 600
    const height = 180
    const padding = 24
    const counts = chartData.map((d) => d.count)
    const maxCount = Math.max(1, ...counts)
    const stepX = chartData.length > 1 ? (width - padding * 2) / (chartData.length - 1) : 0
    const points = chartData.map((d, i) => {
      const x = padding + i * stepX
      const y = padding + (height - padding * 2) * (1 - d.count / maxCount)
      return { x, y }
    })
    return { width, height, padding, maxCount, points }
  }, [chartData])

  const kpis = useMemo(() => {
    const total = logs.length
    
    // Last 24h activities
    const recent = logs.filter((log) => {
      const d = new Date(log.timestamp)
      const diff = Date.now() - d.getTime()
      return diff <= 24 * 60 * 60 * 1000
    }).length
    
    // Most active user
    const actorCounts: Record<string, number> = {}
    logs.forEach(log => {
      actorCounts[log.actor] = (actorCounts[log.actor] || 0) + 1
    })
    const topActorEntry = Object.entries(actorCounts).sort((a, b) => b[1] - a[1])[0]
    const topActor = topActorEntry ? `${topActorEntry[0]} (${topActorEntry[1]})` : 'N/A'
    
    // Most active category
    const categoryCounts: Record<string, number> = {}
    logs.forEach(log => {
      if (log.category) {
        categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1
      }
    })
    const topCategoryEntry = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]
    const topCategory = topCategoryEntry ? `${topCategoryEntry[0]} (${topCategoryEntry[1]})` : 'N/A'

    return [
      { label: 'Total Activities', value: total.toString() },
      { label: 'Last 24h', value: recent.toString() },
      { label: 'Most Active User', value: topActor },
      { label: 'Top Category', value: topCategory },
    ]
  }, [logs])

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Page Hero */}
      <PageTitleHero
        title="Audit & Activity Logs"
        subtitle="Monitor system activities, user actions, and security events across the platform."
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Activity Monitoring</h2>
          <p className="text-sm text-slate-500">Real-time audit log analytics and filtering</p>
        </div>
        <button
          onClick={loadLogs}
          className="px-3 py-2 border border-black shadow-md bg-white text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 rounded"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Activities */}
        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-blue-700">Total Activities</div>
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{kpis[0].value}</div>
          <div className="text-xs text-blue-600 mt-2">All system events</div>
        </div>

        {/* Last 24h */}
        <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-green-700">Last 24h</div>
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">{kpis[1].value}</div>
          <div className="text-xs text-green-600 mt-2">Recent activity</div>
        </div>

        {/* Most Active User */}
        <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-purple-700">Most Active User</div>
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-purple-600">{kpis[2].value}</div>
          <div className="text-xs text-purple-600 mt-2">Top contributor</div>
        </div>

        {/* Top Category */}
        <div className="bg-gradient-to-br from-white to-orange-50 border border-orange-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-orange-700">Top Category</div>
            <Tag className="w-6 h-6 text-orange-600" />
          </div>
          <div className="text-lg font-bold text-orange-600">{kpis[3].value}</div>
          <div className="text-xs text-orange-600 mt-2">Most active type</div>
        </div>
      </div>

      {/* Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Category Line Chart */}
        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-blue-900">Category Trends</div>
            <button
              onClick={() => { setGraphType('category'); setShowGraphModal(true) }}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
              title="Expand graph"
            >
              <Maximize2 className="w-4 h-4 text-blue-600" />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select
              value={graphYear}
              onChange={(e) => setGraphYear(parseInt(e.target.value))}
              className="px-2 py-1 border border-black shadow-md bg-white text-xs font-semibold rounded"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {logsLoading ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500">Loading...</div>
          ) : logsError ? (
            <div className="h-40 flex items-center justify-center text-xs text-red-600">{logsError}</div>
          ) : (
            <div className="h-56">
              <ActivityCategoryLineChart logs={isFiltered ? filteredLogs : logs} year={graphYear} />
            </div>
          )}
        </div>

        {/* Activity Calendar */}
        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-blue-900">Activity Calendar</div>
            <button
              onClick={() => { setGraphType('calendar'); setShowGraphModal(true) }}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
              title="Expand graph"
            >
              <Maximize2 className="w-4 h-4 text-blue-600" />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select
              value={graphYear}
              onChange={(e) => setGraphYear(parseInt(e.target.value))}
              className="px-2 py-1 border border-black shadow-md bg-white text-xs font-semibold rounded"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={graphMonth}
              onChange={(e) => setGraphMonth(parseInt(e.target.value))}
              className="px-2 py-1 border border-black shadow-md bg-white text-xs font-semibold rounded"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('en-US', { month: 'short' })}
                </option>
              ))}
            </select>
          </div>
          {logsLoading ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500">Loading...</div>
          ) : logsError ? (
            <div className="h-40 flex items-center justify-center text-xs text-red-600">{logsError}</div>
          ) : (
            <div className="h-56">
              <ActivityCalendarChart year={graphYear} month={graphMonth} logs={isFiltered ? filteredLogs : logs} />
            </div>
          )}
        </div>

        {/* Filter Options Panel */}
        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-4 rounded-lg">
          <div className="text-sm font-bold text-blue-900 mb-3">Filter Options</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'All' | AuditCategory)}
                className="w-full mt-1 px-2 py-1 border border-slate-200 shadow-md bg-white text-xs"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'All' | AuditStatus)}
                className="w-full mt-1 px-2 py-1 border border-slate-200 shadow-md bg-white text-xs"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold block mb-2">Status Legend</label>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-100 border border-green-800 rounded"></span>
                  <span className="text-slate-600">Success - Action completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-100 border border-yellow-800 rounded"></span>
                  <span className="text-slate-600">Warning - Completed w/ issues</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-100 border border-red-800 rounded"></span>
                  <span className="text-slate-600">Error - Action failed</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-2">Search Actor/Activity by ID or Name</label>
              <input
                value={actorQuery}
                onChange={(e) => setActorQuery(e.target.value)}
                placeholder="Enter actor name or ID"
                className="w-full mt-1 px-2 py-1 border border-slate-300 shadow-md text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Activity Table (Collapsible) */}
      {isFiltered && (
        <div className="bg-white border border-blue-200 shadow-md overflow-hidden rounded-lg">
          <div
            className="flex items-center justify-between px-5 py-4 border-b border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors bg-gradient-to-r from-white to-blue-50"
            onClick={() => setFilteredCollapsed(!filteredCollapsed)}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                {category !== 'All' && category in categoryDescriptions && (
                  <>
                    <span className="font-bold text-blue-900 text-base">{categoryDescriptions[category as AuditCategory].title}</span>
                    <p className="text-xs text-slate-700">{categoryDescriptions[category as AuditCategory].description}</p>
                  </>
                )}
                {category === 'All' && (
                  <>
                    <span className="font-bold text-blue-900 text-base">Filtered Activity</span>
                    <p className="text-xs text-slate-700">Activities matching current filters</p>
                  </>
                )}
              </div>
              <span className="text-sm text-white bg-blue-600 px-3 py-1 font-semibold whitespace-nowrap rounded">{filteredLogs.length}</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${filteredCollapsed ? '-rotate-90' : ''}`} />
          </div>

          {!filteredCollapsed && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-700 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
                  <tr>
                    <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Time</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Actor</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Role</th>
                    <th className="text-left py-3 px-4 font-bold text-blue-900">Action</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Entity</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Entity ID</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Status</th>
                    <th className="text-left py-3 px-4 font-bold text-blue-900">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">Loading activity…</td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">No activity for this filter.</td>
                    </tr>
                  ) : (
                    filteredLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap text-xs">{formatDate(log.timestamp)} {formatTime(log.timestamp)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{log.actor}</td>
                        <td className="py-3 px-4 capitalize text-xs whitespace-nowrap">{log.role}</td>
                        <td className="py-3 px-4">{log.action}</td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">{log.entity}</td>
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">{log.entity_id?.substring(0, 12)}...</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold capitalize rounded inline-block ${
                            log.status === 'success' ? 'bg-green-100 text-green-800' :
                            log.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* All Activity Table (Collapsible) */}
      <div className="bg-white border border-blue-200 shadow-md overflow-hidden rounded-lg">
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors bg-gradient-to-r from-white to-blue-50"
          onClick={() => setAllActivityCollapsed(!allActivityCollapsed)}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span className="font-bold text-blue-900 text-base">All Activity</span>
              <p className="text-xs text-slate-700">Complete audit log of all events in the system</p>
            </div>
            <span className="text-sm text-white bg-blue-600 px-3 py-1 font-semibold whitespace-nowrap rounded">{logs.length}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${allActivityCollapsed ? '-rotate-90' : ''}`} />
        </div>

        {!allActivityCollapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-700 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
                <tr>
                  <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Time</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Actor</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Role</th>
                  <th className="text-left py-3 px-4 font-bold text-blue-900">Action</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Entity</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Entity ID</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap font-bold text-blue-900">Status</th>
                  <th className="text-left py-3 px-4 font-bold text-blue-900">Details</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">Loading activity…</td>
                  </tr>
                ) : logsError ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-red-600">{logsError}</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">No activity yet</td>
                  </tr>
                ) : (
                  logs.slice((allActivityPage - 1) * allActivityPageSize, allActivityPage * allActivityPageSize).map((log) => (
                    <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap text-xs">{formatDate(log.timestamp)} {formatTime(log.timestamp)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{log.actor}</td>
                      <td className="py-3 px-4 capitalize text-xs whitespace-nowrap">{log.role}</td>
                      <td className="py-3 px-4">{log.action}</td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">{log.entity}</td>
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">{log.entity_id?.substring(0, 12)}...</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold capitalize rounded inline-block ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' :
                          log.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}

          {logs.length > allActivityPageSize && (
            <div className="px-5 py-4 border-t border-blue-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page {allActivityPage} of {Math.ceil(logs.length / allActivityPageSize)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAllActivityPage(Math.max(1, allActivityPage - 1))}
                  disabled={allActivityPage === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setAllActivityPage(Math.min(Math.ceil(logs.length / allActivityPageSize), allActivityPage + 1))}
                  disabled={allActivityPage === Math.ceil(logs.length / allActivityPageSize)}
                  className="flex items-center gap-1 px-3 py-2 border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded text-sm font-medium"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Activity Guide */}
      <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-md p-6 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-4 text-xl">Activity Categories Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryDescriptions).map(([key, value]) => (
            <div key={key} className="p-4 bg-white border-l-4 border-l-blue-500 shadow hover:shadow-md transition-shadow rounded">
              <div className="font-bold text-slate-900 text-sm mb-1">{value.title}</div>
              <div className="text-xs text-slate-700 mb-3 font-medium">{value.description}</div>
              <div className="text-xs text-slate-700">
                <strong className="text-blue-700">Examples:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {value.activities.map((act, i) => (
                    <li key={i} className="text-slate-800">{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable Graph Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-blue-200 bg-white">
              <div>
                <h3 className="text-lg font-bold text-blue-900">
                  {graphType === 'category' ? 'Activity Category Trends' : 'Activity Calendar'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {graphType === 'category' ? `Year ${graphYear}` : `${new Date(graphYear, graphMonth - 1).toLocaleString('en-US', { month: 'long' })} ${graphYear}`}
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

              {logsLoading ? (
                <div className="h-96 flex items-center justify-center text-sm text-slate-500">Loading...</div>
              ) : logsError ? (
                <div className="h-96 flex items-center justify-center text-sm text-red-600">{logsError}</div>
              ) : (
                <div className="h-96">
                  {graphType === 'category' ? (
                    <ActivityCategoryLineChart logs={isFiltered ? filteredLogs : logs} year={graphYear} />
                  ) : (
                    <ActivityCalendarChart year={graphYear} month={graphMonth} logs={isFiltered ? filteredLogs : logs} variant="expanded" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
