/**
 * Admin Scans Management Page
 * Features: scans table with filtering, disable/delete, pagination
 */
import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Eye,
  X,
  Calendar,
  LineChart,
  PieChart,
  Maximize2,
  Image as ImageIcon,
  User,
  Fish,
  Award,
  Copy,
  Check,
  Trash2,
  Ban,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import {
  getAdminScanPage,
  getAdminScanStats,
  toggleScanStatus,
  deleteAdminScan,
  type AdminScanEntry,
  type AdminScanStats,
} from '../services/api'

type GradeType = 'Export' | 'Local' | 'Reject' | 'Unknown'
type FilterGrade = 'all' | 'Export' | 'Local' | 'Reject'
type FilterDetection = 'all' | 'detected' | 'not-detected'

const gradeColors: Record<GradeType, string> = {
  Export: 'bg-green-100 text-green-800',
  Local: 'bg-blue-100 text-blue-800',
  Reject: 'bg-red-100 text-red-800',
  Unknown: 'bg-slate-100 text-slate-600',
}

// Copy Button Component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-1 rounded transition-all ${copied ? 'bg-green-100 text-green-600' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`}
      title={copied ? 'Copied!' : 'Copy ID'}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function ScanCalendarChart({
  year,
  month,
  scans,
  variant = 'compact',
}: {
  year: number
  month: number
  scans: AdminScanEntry[]
  variant?: 'compact' | 'expanded'
}) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const scansByDay = useMemo(() => {
    const daysMap: Record<number, number> = {}
    const daysData: Record<number, { day: number | null; count: number; isFuture?: boolean }> = {}
    const today = new Date()
    const isCurrentMonthYear = today.getFullYear() === year && today.getMonth() + 1 === month

    scans.forEach((scan) => {
      if (scan.timestamp) {
        const scanDate = new Date(scan.timestamp)
        if (!isNaN(scanDate.getTime()) && scanDate.getFullYear() === year && scanDate.getMonth() + 1 === month) {
          const day = scanDate.getDate()
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
  }, [year, month, scans])

  const maxCount = Math.max(...scansByDay.map((d) => d.count), 1)
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
    <div className="space-y-2 h-full flex flex-col">
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
          {scansByDay.map((dayData, idx) => {
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
                onMouseMove={(e) => dayData.day !== null && !dayData.isFuture && dayData.count > 0 ? setHover({ x: e.clientX, y: e.clientY, text: `Scans: ${dayData.count}` }) : null}
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

function DaingTypeLineChart({ scans, year }: { scans: AdminScanEntry[]; year: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    scans.forEach((scan) => {
      if (!scan.timestamp) return
      const scanDate = new Date(scan.timestamp)
      if (isNaN(scanDate.getTime()) || scanDate.getFullYear() !== year) return
      const type = scan.fish_type?.trim() || 'Unknown'
      counts[type] = (counts[type] || 0) + 1
    })

    const preferredOrder = ['Bisugo', 'Danggit', 'Espada', 'Dalagangbukid', 'Flyingfish', 'Unknown']
    const ordered = preferredOrder.map((label) => ({ label, value: counts[label] ?? 0 }))
    const remaining = Object.keys(counts)
      .filter((label) => !preferredOrder.includes(label))
      .sort()
      .map((label) => ({ label, value: counts[label] }))

    return [...ordered, ...remaining]
  }, [scans, year])

  if (data.length === 0) {
    return <div className="h-40 flex items-center justify-center text-slate-500">No data</div>
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const width = 720
  const height = 230
  const padding = { top: 12, right: 24, bottom: 40, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const points = data.map((item, idx) => {
    const x = padding.left + (chartWidth * (data.length === 1 ? 0.5 : idx / (data.length - 1)))
    const y = padding.top + chartHeight - (item.value / maxValue) * chartHeight
    return { x, y, value: item.value }
  })

  const path = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  return (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex-1 flex flex-col relative min-h-0 w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
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

          <path d={path} fill="none" stroke="#2563EB" strokeWidth="2" />
          {points.map((point, idx) => (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, text: `${data[idx].label}: ${point.value}` })}
              onMouseLeave={() => setHover(null)}
            >
              <circle cx={point.x} cy={point.y} r="3" fill="#2563EB" />
              <text
                x={point.x}
                y={Math.max(point.y - 8, padding.top + 8)}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#2563EB"
              >
                {point.value}
              </text>
            </g>
          ))}

          {points.map((point, idx) => (
            <text
              key={`label-${idx}`}
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#64748B"
            >
              {data[idx].label}
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
    </div>
  )
}

function ScanQualityDonut({ scans, year }: { scans: AdminScanEntry[]; year: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const counts = useMemo(() => {
    const summary = { Export: 0, Local: 0, Reject: 0 }
    scans.forEach((scan) => {
      if (!scan.timestamp) return
      const scanDate = new Date(scan.timestamp)
      if (isNaN(scanDate.getTime()) || scanDate.getFullYear() !== year) return
      if (scan.grade === 'Export') summary.Export += 1
      if (scan.grade === 'Local') summary.Local += 1
      if (scan.grade === 'Reject') summary.Reject += 1
    })
    return summary
  }, [scans, year])

  const total = counts.Export + counts.Local + counts.Reject
  if (total === 0) {
    return <div className="h-40 flex items-center justify-center text-slate-500">No data</div>
  }

  const segments = [
    { label: 'Export', value: counts.Export, color: '#22C55E' },
    { label: 'Local', value: counts.Local, color: '#3B82F6' },
    { label: 'Reject', value: counts.Reject, color: '#EF4444' },
  ]

  return (
    <div className="flex flex-col gap-4 h-full justify-center relative">
      {segments.map((segment) => {
        const ratio = total > 0 ? segment.value / total : 0
        return (
          <div
            key={segment.label}
            className="flex items-center gap-3 cursor-pointer"
            onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, text: `${segment.label}: ${segment.value} (${Math.round(ratio * 100)}%)` })}
            onMouseLeave={() => setHover(null)}
          >
            <div className="w-20 text-xs font-semibold text-slate-700">{segment.label}</div>
            <div className="relative flex-1 h-4 bg-slate-100 rounded-full">
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full"
                style={{ width: `${Math.max(ratio * 100, 4)}%`, backgroundColor: segment.color }}
              />
              <span
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-white"
                style={{ left: `calc(${ratio * 100}% - 8px)`, borderColor: segment.color }}
              />
              <span
                className="absolute -top-6 text-xs font-semibold text-slate-700"
                style={{ left: `calc(${ratio * 100}% - 6px)` }}
              >
                {segment.value}
              </span>
            </div>
            <div className="w-12 text-right text-sm font-semibold text-slate-700">{Math.round(ratio * 100)}%</div>
          </div>
        )
      })}
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

export default function AdminScansPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<FilterGrade>('all')
  const [fishTypeFilter, setFishTypeFilter] = useState('all')
  const [detectionFilter, setDetectionFilter] = useState<FilterDetection>('all')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Data state
  const [scans, setScans] = useState<AdminScanEntry[]>([])
  const [totalScans, setTotalScans] = useState(0)
  const [stats, setStats] = useState<AdminScanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyticsScans, setAnalyticsScans] = useState<AdminScanEntry[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Detail modal
  const [detailModal, setDetailModal] = useState<{ open: boolean; scan: AdminScanEntry | null }>({ open: false, scan: null })

  // Disable modal
  const [disableModal, setDisableModal] = useState<{ open: boolean; scan: AdminScanEntry | null }>({ open: false, scan: null })
  const [disableReason, setDisableReason] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; scan: AdminScanEntry | null }>({ open: false, scan: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Graph state
  const today = new Date()
  const [graphType, setGraphType] = useState<'types' | 'quality' | 'calendar'>('types')
  const [graphYear, setGraphYear] = useState(today.getFullYear())
  const [graphMonth, setGraphMonth] = useState(today.getMonth() + 1)
  const [showGraphModal, setShowGraphModal] = useState(false)

  // Fetch scans
  const fetchScans = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminScanPage(page, pageSize)
      setScans(res.entries || [])
      setTotalScans(res.total || 0)
    } catch (e) {
      setError('Failed to load scans')
      console.error('Failed to fetch scans:', e)
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await getAdminScanStats()
      setStats(res.stats || null)
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }

  const fetchAnalyticsScans = async () => {
    setAnalyticsLoading(true)
    try {
      const pageSize = 200
      let pageIndex = 1
      let allScans: AdminScanEntry[] = []
      let total = 0

      while (true) {
        const res = await getAdminScanPage(pageIndex, pageSize)
        allScans = allScans.concat(res.entries || [])
        total = res.total || 0
        if (allScans.length >= total || (res.entries || []).length === 0) break
        pageIndex += 1
      }

      setAnalyticsScans(allScans)
    } catch (e) {
      console.error('Failed to load analytics scans')
      setAnalyticsScans([])
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    fetchScans()
  }, [page])

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchAnalyticsScans()
  }, [])

  // Filter scans locally (search and filters)
  const filteredScans = scans.filter((scan) => {
    const grade = scan.grade || 'Unknown'
    if (gradeFilter !== 'all' && grade !== gradeFilter) return false
    const fishType = scan.fish_type || 'Unknown'
    // Case-insensitive fish type comparison
    if (fishTypeFilter !== 'all' && fishType.toLowerCase() !== fishTypeFilter.toLowerCase()) return false
    // Detection filter
    if (detectionFilter === 'detected' && !scan.detected) return false
    if (detectionFilter === 'not-detected' && scan.detected) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        scan.id.toLowerCase().includes(q) ||
        fishType.toLowerCase().includes(q) ||
        (scan.user_name || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalPages = Math.ceil(totalScans / pageSize)

  const totalDetected = useMemo(() => {
    return analyticsScans.filter((scan) => scan.detected).length
  }, [analyticsScans])

  const avgScoreValue = useMemo(() => {
    if (stats && typeof stats.avg_score === 'number') return stats.avg_score
    const scored = analyticsScans.filter((scan) => typeof scan.score === 'number')
    if (scored.length === 0) return null
    const sum = scored.reduce((total, scan) => total + (scan.score || 0), 0)
    return sum / scored.length
  }, [analyticsScans, stats])

  // Bulk selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredScans.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredScans.map((s) => s.id)))
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getGradeDisplay = (grade: string | null | undefined): GradeType => {
    if (!grade || grade === 'Unknown') return 'Unknown'
    if (grade === 'Export' || grade === 'Local' || grade === 'Reject') return grade
    return 'Unknown'
  }

  const getScoreDisplay = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'N/A'
    return `${(score * 100).toFixed(1)}%`
  }

  const allSelected = filteredScans.length > 0 && selectedIds.size === filteredScans.length

  // Disable handlers
  const handleDisableClick = (scan: AdminScanEntry, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDisableModal({ open: true, scan })
    setDisableReason('')
  }

  const handleDisableConfirm = async () => {
    if (!disableModal.scan) return
    setDisableLoading(true)
    try {
      await toggleScanStatus(disableModal.scan.id, disableReason)
      await fetchScans()
      await fetchStats()
      await fetchAnalyticsScans()
      setDisableModal({ open: false, scan: null })
    } catch (e) {
      alert('Failed to update scan status')
    } finally {
      setDisableLoading(false)
    }
  }

  // Delete handlers
  const handleDeleteClick = (scan: AdminScanEntry, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDeleteModal({ open: true, scan })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.scan) return
    setDeleteLoading(true)
    try {
      await deleteAdminScan(deleteModal.scan.id)
      await fetchScans()
      await fetchStats()
      await fetchAnalyticsScans()
      setDeleteModal({ open: false, scan: null })
      if (detailModal.scan?.id === deleteModal.scan.id) {
        setDetailModal({ open: false, scan: null })
      }
    } catch (e) {
      alert('Failed to delete scan')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Page Hero */}
      <PageTitleHero
        title="Scans Management"
        subtitle="View and manage all AI grading scan history and results."
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* KPI + Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPIs on the left - 2x2 grid */}
        <div className="grid grid-cols-2 gap-4 lg:items-start">
          <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-blue-700">Total Scans</div>
              <ImageIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats?.total_scans?.toLocaleString() || '-'}</div>
            <div className="text-xs text-blue-600 mt-2">All scans</div>
          </div>
          <div className="bg-gradient-to-br from-white to-red-50 border border-red-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-red-700">Total Rejects</div>
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-600">{stats?.reject_count ?? '-'}</div>
            <div className="text-xs text-red-600 mt-2">Rejected scans</div>
          </div>
          <div className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-emerald-700">Daing Detected</div>
              <Fish className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-emerald-600">{analyticsLoading ? '-' : totalDetected}</div>
            <div className="text-xs text-emerald-600 mt-2">Detected scans</div>
          </div>
          <div className="bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-indigo-700">Avg Confidence</div>
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold text-indigo-700">
              {avgScoreValue !== null ? `${(avgScoreValue * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-xs text-indigo-600 mt-2">Average score</div>
          </div>
        </div>

        {/* Graph on the right */}
        <div className="lg:col-span-2 bg-white border border-blue-200 shadow-md p-3 rounded-lg max-h-[300px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-blue-900">Scan Analytics</h3>
            <button
              onClick={() => setShowGraphModal(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 transition-colors border border-blue-300 rounded"
              title="Expand view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Graph Type Toggle + Filter Controls on same row */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <button
              onClick={() => setGraphType('types')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'types'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <LineChart className="w-3 h-3 inline mr-0.5" />
              Daing Types
            </button>
            <button
              onClick={() => setGraphType('quality')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'quality'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <PieChart className="w-3 h-3 inline mr-0.5" />
              Quality Distribution
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
              Scan Calendar
            </button>
            <select
              value={graphYear}
              onChange={(e) => setGraphYear(Number(e.target.value))}
              className="px-1.5 py-1 border border-blue-300 bg-white text-xs rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {[today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2].map((y) => (
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
            {graphType === 'types' ? (
              <DaingTypeLineChart scans={analyticsScans} year={graphYear} />
            ) : graphType === 'quality' ? (
              <ScanQualityDonut scans={analyticsScans} year={graphYear} />
            ) : (
              <ScanCalendarChart year={graphYear} month={graphMonth} scans={analyticsScans} />
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
          <input
            type="text"
            placeholder="Search by ID, fish type, user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-blue-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
          />
        </div>

        {/* Grade Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <select
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value as FilterGrade)
              setPage(1)
            }}
            className="px-3 py-2.5 border border-blue-300 bg-white text-base text-slate-900 min-w-[130px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
          >
            <option value="all">All Grades</option>
            <option value="Export">Export</option>
            <option value="Local">Local</option>
            <option value="Reject">Reject</option>
          </select>
        </div>

        {/* Fish Type Filter */}
        <select
          value={fishTypeFilter}
          onChange={(e) => {
            setFishTypeFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2.5 border border-blue-300 bg-white text-base text-slate-900 min-w-[160px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
        >
          <option value="all">All Fish Types</option>
          <option value="Danggit">Danggit</option>
          <option value="Espada">Espada</option>
          <option value="Dalagangbukid">Dalagangbukid</option>
          <option value="Flyingfish">Flyingfish</option>
          <option value="Bisugo">Bisugo</option>
          <option value="Unknown">Unknown</option>
        </select>

        {/* Detection Filter */}
        <select
          value={detectionFilter}
          onChange={(e) => {
            setDetectionFilter(e.target.value as FilterDetection)
            setPage(1)
          }}
          className="px-3 py-2.5 border border-blue-300 bg-white text-base text-slate-900 min-w-[160px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
        >
          <option value="all">All Detections</option>
          <option value="detected">Daing Detected</option>
          <option value="not-detected">No Daing Detected</option>
        </select>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-2 border border-blue-300 rounded">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => {
                const firstScan = scans.find((s) => selectedIds.has(s.id))
                if (firstScan) handleDeleteClick(firstScan)
              }}
              className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors rounded"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        )}

        {/* Export */}
        <button className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 bg-white text-base text-blue-700 hover:bg-blue-50 ml-auto font-semibold transition-colors rounded">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Detection Filter Header */}
      {detectionFilter !== 'all' && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
          detectionFilter === 'detected' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {detectionFilter === 'detected' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`font-semibold ${
            detectionFilter === 'detected' ? 'text-green-800' : 'text-red-800'
          }`}>
            {detectionFilter === 'detected' ? 'Showing Daing Detected Scans' : 'Showing No Daing Detected Scans'}
          </span>
          <span className="text-sm text-slate-600">
            ({filteredScans.length} {filteredScans.length === 1 ? 'scan' : 'scans'})
          </span>
          <button
            onClick={() => setDetectionFilter('all')}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-sm text-slate-600 hover:text-slate-800 hover:bg-white/50 rounded transition-colors"
          >
            <X className="w-4 h-4" />
            Clear Filter
          </button>
        </div>
      )}

      {/* Scans Table */}
      <div className="bg-white border border-blue-200 shadow-sm overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-200">
              <tr>
                <th className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-blue-600"
                  />
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Image</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Fish Type</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Detection</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Grade</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Score</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Date</th>
                <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-600">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading scans...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-red-600">{error}</td>
                </tr>
              ) : filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-600">No scans found</td>
                </tr>
              ) : (
                filteredScans.map((scan) => {
                  const grade = getGradeDisplay(scan.grade)
                  const fishType = scan.fish_type || 'Unknown'
                  const userName = scan.user_name || 'Unknown'
                  const score = scan.score

                  return (
                    <tr key={scan.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(scan.id)}
                          onChange={() => handleToggleSelect(scan.id)}
                          className="w-4 h-4 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-800 font-mono">{scan.id.slice(0, 12)}</span>
                          <CopyButton text={scan.id} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-16 h-16 bg-blue-50 flex items-center justify-center border border-blue-200 overflow-hidden rounded">
                          {scan.url ? (
                            <img src={scan.url} alt="Scan" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-blue-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Fish className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-800 font-medium">{fishType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${scan.detected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {scan.detected ? 'Detected' : 'No Detection'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${gradeColors[grade]}`}>
                          <Award className="w-3 h-3" />
                          {grade}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {score !== null && score !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${score >= 0.9 ? 'bg-green-500' : score >= 0.8 ? 'bg-blue-500' : 'bg-red-500'}`}
                                style={{ width: `${score * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-800 font-medium">{getScoreDisplay(score)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm text-slate-800">{userName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-800">{formatDate(scan.timestamp)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailModal({ open: true, scan })}
                            className="p-2 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDisableClick(scan, e)}
                            className="p-2 hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-transparent hover:border-orange-200 transition-all"
                            title="Disable Scan"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(scan, e)}
                            className="p-2 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-transparent hover:border-red-200 transition-all"
                            title="Delete Scan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="text-sm text-slate-700">
              {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalScans)} of {totalScans}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let startPage = Math.max(1, page - 2)
                const endPage = Math.min(totalPages, startPage + 4)
                if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4)
                const pageNum = startPage + i
                if (pageNum > totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm border rounded transition-colors ${
                      page === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-blue-300 hover:bg-blue-50 text-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Graph Expansion Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowGraphModal(false)}>
          <div
            className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-blue-200 shadow-xl rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-blue-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-blue-900">Scan Analytics - Expanded View</h2>
              <button
                onClick={() => setShowGraphModal(false)}
                className="p-2 hover:bg-blue-50 transition-colors rounded"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setGraphType('types')}
                  className={`px-4 py-2 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'types'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <LineChart className="w-4 h-4 inline mr-1" />
                  Daing Types
                </button>
                <button
                  onClick={() => setGraphType('quality')}
                  className={`px-4 py-2 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'quality'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <PieChart className="w-4 h-4 inline mr-1" />
                  Quality Distribution
                </button>
                <button
                  onClick={() => setGraphType('calendar')}
                  className={`px-4 py-2 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'calendar'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Scan Calendar
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={graphYear}
                  onChange={(e) => setGraphYear(Number(e.target.value))}
                  className="px-4 py-2 border border-blue-300 bg-white text-sm rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {[today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {graphType === 'calendar' && (
                  <select
                    value={graphMonth}
                    onChange={(e) => setGraphMonth(Number(e.target.value))}
                    className="px-4 py-2 border border-blue-300 bg-white text-sm rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

              <div className="p-8 bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-lg">
                {graphType === 'types' ? (
                  <DaingTypeLineChart scans={analyticsScans} year={graphYear} />
                ) : graphType === 'quality' ? (
                  <ScanQualityDonut scans={analyticsScans} year={graphYear} />
                ) : (
                  <ScanCalendarChart year={graphYear} month={graphMonth} scans={analyticsScans} variant="expanded" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal.open && detailModal.scan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailModal({ open: false, scan: null })}>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-black/15 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/15 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">Scan Details</h2>
              <button onClick={() => setDetailModal({ open: false, scan: null })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image */}
                <div className="shrink-0">
                  <div className="w-full md:w-64 aspect-square bg-slate-100 border border-black/10 overflow-hidden">
                    {detailModal.scan.url ? (
                      <img src={detailModal.scan.url} alt="Scan" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-slate-300" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium ${gradeColors[getGradeDisplay(detailModal.scan.grade)]}`}>
                      <Award className="w-4 h-4" />
                      {getGradeDisplay(detailModal.scan.grade)} Grade
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Fish Type</div>
                      <div className="flex items-center gap-2 text-slate-900 font-medium">
                        <Fish className="w-4 h-4 text-slate-500" />
                        {detailModal.scan.fish_type || 'Unknown'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Confidence Score</div>
                      {detailModal.scan.score !== null && detailModal.scan.score !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${detailModal.scan.score >= 0.9 ? 'bg-green-500' : detailModal.scan.score >= 0.8 ? 'bg-blue-500' : 'bg-red-500'}`}
                              style={{ width: `${detailModal.scan.score * 100}%` }}
                            />
                          </div>
                          <span className="text-slate-900 font-medium">{getScoreDisplay(detailModal.scan.score)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">User</div>
                      <div className="flex items-center gap-2 text-slate-900">
                        <User className="w-4 h-4 text-slate-500" />
                        {detailModal.scan.user_name || 'Unknown'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date & Time</div>
                      <div className="flex items-center gap-2 text-slate-900">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {formatDate(detailModal.scan.timestamp)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Detection Status</div>
                      <div className="flex items-center gap-2">
                        {detailModal.scan.detected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded">
                            <CheckCircle className="w-3 h-3" />
                            Daing Detected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded">
                            <XCircle className="w-3 h-3" />
                            No Daing Detected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scan ID */}
                  <div className="pt-4 border-t border-black/10">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Scan ID</div>
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-100 px-2 py-1 font-mono text-sm text-slate-800">{detailModal.scan.id}</code>
                      <CopyButton text={detailModal.scan.id} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between p-5 border-t border-black/15 bg-slate-50 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDisableClick(detailModal.scan!)}
                  className="px-4 py-2 border border-orange-300 text-orange-600 text-base font-medium hover:bg-orange-50"
                >
                  Disable Scan
                </button>
                <button
                  onClick={() => handleDeleteClick(detailModal.scan!)}
                  className="px-4 py-2 border border-red-300 text-red-600 text-base font-medium hover:bg-red-50"
                >
                  Delete Scan
                </button>
              </div>
              <button
                onClick={() => setDetailModal({ open: false, scan: null })}
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable Scan Modal */}
      {disableModal.open && disableModal.scan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md border border-black/15 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/15">
              <h2 className="text-lg font-semibold text-slate-900">Disable Scan</h2>
              <button onClick={() => setDisableModal({ open: false, scan: null })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-black/10">
                <div className="font-medium text-slate-900">Scan ID: {disableModal.scan.id.slice(0, 20)}...</div>
                <div className="text-sm text-slate-600 mt-1">by {disableModal.scan.user_name || 'Unknown'}</div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  This scan will be disabled and hidden from public view. The user will be notified via email with the reason provided.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">Reason for disabling</label>
                <textarea
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-black/15 text-base text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="e.g., Image quality issues, inappropriate content, copyright violation..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-black/15 bg-slate-50">
              <button
                onClick={() => setDisableModal({ open: false, scan: null })}
                className="px-4 py-2 border border-black/15 text-base text-slate-800 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableConfirm}
                disabled={disableLoading}
                className="px-4 py-2 bg-orange-600 text-white text-base font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {disableLoading ? 'Processing...' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Scan Modal */}
      {deleteModal.open && deleteModal.scan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md border border-black/15 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/15">
              <h2 className="text-lg font-semibold text-slate-900">Delete Scan Permanently</h2>
              <button onClick={() => setDeleteModal({ open: false, scan: null })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-black/10">
                <div className="font-medium text-slate-900">Scan ID: {deleteModal.scan.id.slice(0, 20)}...</div>
                <div className="text-sm text-slate-600 mt-1">by {deleteModal.scan.user_name || 'Unknown'}</div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-900 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong>Warning:</strong> This action is permanent and cannot be undone. The scan image will be permanently deleted from the database and cloud storage.
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-black/15 bg-slate-50">
              <button
                onClick={() => setDeleteModal({ open: false, scan: null })}
                className="px-4 py-2 border border-black/15 text-base text-slate-800 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white text-base font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
