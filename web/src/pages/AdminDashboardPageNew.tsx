/**
 * Admin Dashboard — New multi-section analytics page.
 * 5 inner tabs: Users, Scans, Market, Community, Activities
 * Users & Market: Real data from backend. Other tabs: Sample data.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Users, ScanLine, ShoppingBag, MessageCircle, Activity,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Filter, Download, ChevronLeft, ChevronRight, Search,
  Calendar, Maximize2, UserX, Package, DollarSign, BarChart3,
} from 'lucide-react'
import { BarChart } from '@tremor/react'
import {
  Badge, TextInput, ActionIcon, Group, Button, Modal, Tooltip,
} from '@mantine/core'
import { DatePickerInput, DatesRangeValue } from '@mantine/dates'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, createColumnHelper, type SortingState,
} from '@tanstack/react-table'
import AdminReportPanel from '../components/admin/AdminReportPanel'
import { KpiCard } from '../components/ui/KpiCard'
import { DynamicPercentageBadge } from '../components/ui/DynamicPercentageBadge'
import {
  getAdminUserKpis, getAdminUserChart, getAdminUserCalendar,
  getAdminUserSegmentation, getAdminUsers,
  getAdminMarketKpis, getAdminMarketChart, getAdminMarketSegmentation, getAdminMarketTable,
  type AdminUserKpis, type AdminUserChartPoint, type AdminUserCalendarResponse,
  type AdminUser, type AdminMarketKpis, type AdminMarketChartPoint,
  type AdminMarketSegmentation, type AdminMarketProduct, type AdminMarketTableResponse,
} from '../services/api'

// ─────────────────────────────────────── Types ───
type SectionKey = 'users' | 'scans' | 'market' | 'community' | 'activities'

interface KpiItem {
  label: string; value: string; change: number; subtitle: string
  icon: React.ElementType; iconBg: string; iconColor: string
}
interface ChartPoint { period: string; value: number }
interface ProgressItem { label: string; value: number; max: number; description: string }
interface DonutSlice { label: string; value: number; color: string }
interface TableRow { id: string; cols: string[] }
interface SectionData {
  kpis: KpiItem[]; chartTitle: string; chartData: ChartPoint[]; chartColor: string
  progressA: { title: string; subtitle: string; items: ProgressItem[] }
  progressB: { title: string; subtitle: string; items: ProgressItem[] }
  donut: { title: string; slices: DonutSlice[] }
  table: { headers: string[]; rows: TableRow[] }
}

// ──────────────────────────────── Section Tabs ───
const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType }[] = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'scans', label: 'Scans', icon: ScanLine },
  { key: 'market', label: 'Market', icon: ShoppingBag },
  { key: 'community', label: 'Community', icon: MessageCircle },
  { key: 'activities', label: 'Activities', icon: Activity },
]

// ────────────────────────── Sample Data (generic sections) ──

function buildSampleData(): Record<'scans' | 'community' | 'activities', SectionData> {
  return {
    scans: {
      kpis: [
        { label: 'Total Scans', value: '45,832', change: 22.3, subtitle: 'All-time scan count', icon: ScanLine, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
        { label: 'Scans Today', value: '287', change: 5.4, subtitle: 'Since midnight', icon: Activity, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
        { label: 'Avg per Day', value: '156', change: -1.2, subtitle: 'Last 30 days average', icon: TrendingUp, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
        { label: 'Unique Users', value: '3,891', change: 10.8, subtitle: 'Distinct scanners', icon: Users, iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
      ],
      chartTitle: 'Scan Activity', chartColor: 'green',
      chartData: [
        { period: 'Jan', value: 3200 }, { period: 'Feb', value: 3650 }, { period: 'Mar', value: 4100 },
        { period: 'Apr', value: 3800 }, { period: 'May', value: 4300 }, { period: 'Jun', value: 4700 },
        { period: 'Jul', value: 3900 }, { period: 'Aug', value: 4200 }, { period: 'Sep', value: 3500 },
        { period: 'Oct', value: 3800 }, { period: 'Nov', value: 4400 }, { period: 'Dec', value: 4832 },
      ],
      progressA: { title: 'Scan Results', subtitle: 'Classification breakdown', items: [
        { label: 'Grade A (Premium)', value: 18332, max: 45832, description: 'Highest quality scans' },
        { label: 'Grade B (Standard)', value: 15845, max: 45832, description: 'Standard quality scans' },
        { label: 'Grade C (Below Avg)', value: 11655, max: 45832, description: 'Below average quality' },
      ]},
      progressB: { title: 'Scan Sources', subtitle: 'Where scans originate', items: [
        { label: 'Mobile App', value: 32083, max: 45832, description: 'From DaingApp mobile' },
        { label: 'Web Upload', value: 9166, max: 45832, description: 'Via web interface' },
        { label: 'API Calls', value: 4583, max: 45832, description: 'External API integrations' },
      ]},
      donut: { title: 'Scan Types', slices: [{ label: 'Daing', value: 62, color: '#10b981' }, { label: 'Tuyo', value: 23, color: '#14b8a6' }, { label: 'Other', value: 15, color: '#6ee7b7' }] },
      table: { headers: ['Scan ID', 'User', 'Result', 'Grade', 'Confidence', 'Date'], rows: [
        { id: '1', cols: ['SCN-4832', 'Juan dela Cruz', 'Galunggong', 'A', '96.3%', 'Feb 18, 2026'] },
        { id: '2', cols: ['SCN-4831', 'Maria Santos', 'Bangus', 'B', '88.1%', 'Feb 18, 2026'] },
        { id: '3', cols: ['SCN-4830', 'Pedro Reyes', 'Tilapia', 'A', '94.7%', 'Feb 17, 2026'] },
        { id: '4', cols: ['SCN-4829', 'Ana Garcia', 'Daing', 'A', '97.2%', 'Feb 17, 2026'] },
        { id: '5', cols: ['SCN-4828', 'Jose Rizal', 'Tuyo', 'B', '85.4%', 'Feb 17, 2026'] },
      ]},
    },
    community: {
      kpis: [
        { label: 'Total Posts', value: '4,567', change: 9.1, subtitle: 'Forum posts & articles', icon: MessageCircle, iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
        { label: 'Total Comments', value: '18,234', change: 15.3, subtitle: 'User discussions', icon: MessageCircle, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
        { label: 'Active Threads', value: '892', change: 4.7, subtitle: 'Ongoing conversations', icon: Activity, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
        { label: 'Reports', value: '23', change: -45.2, subtitle: 'Pending moderation', icon: TrendingDown, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
      ],
      chartTitle: 'Community Engagement', chartColor: 'rose',
      chartData: [
        { period: 'Jan', value: 2800 }, { period: 'Feb', value: 3100 }, { period: 'Mar', value: 3500 },
        { period: 'Apr', value: 3200 }, { period: 'May', value: 3700 }, { period: 'Jun', value: 4000 },
        { period: 'Jul', value: 3600 }, { period: 'Aug', value: 3900 }, { period: 'Sep', value: 3400 },
        { period: 'Oct', value: 3800 }, { period: 'Nov', value: 4200 }, { period: 'Dec', value: 4567 },
      ],
      progressA: { title: 'Content Breakdown', subtitle: 'Post types distribution', items: [
        { label: 'Discussions', value: 2284, max: 4567, description: 'General community discussions' },
        { label: 'Questions', value: 1370, max: 4567, description: 'Help & support questions' },
        { label: 'Articles', value: 913, max: 4567, description: 'Long-form content' },
      ]},
      progressB: { title: 'Moderation Stats', subtitle: 'Content review status', items: [
        { label: 'Approved', value: 4450, max: 4567, description: 'Approved content' },
        { label: 'Flagged', value: 94, max: 4567, description: 'Under review' },
        { label: 'Removed', value: 23, max: 4567, description: 'Removed by moderators' },
      ]},
      donut: { title: 'Engagement Type', slices: [{ label: 'Likes', value: 55, color: '#f43f5e' }, { label: 'Comments', value: 30, color: '#fb7185' }, { label: 'Shares', value: 15, color: '#fda4af' }] },
      table: { headers: ['Post ID', 'Title', 'Author', 'Likes', 'Comments', 'Created'], rows: [
        { id: '1', cols: ['PST-4567', 'Best dried fish techniques', 'Juan dela Cruz', '234', '45', 'Feb 18, 2026'] },
        { id: '2', cols: ['PST-4566', 'How to grade daing properly', 'Maria Santos', '189', '32', 'Feb 17, 2026'] },
        { id: '3', cols: ['PST-4565', 'Market price trends 2026', 'Pedro Reyes', '156', '28', 'Feb 17, 2026'] },
        { id: '4', cols: ['PST-4564', 'New seller tips & tricks', 'Ana Garcia', '143', '19', 'Feb 16, 2026'] },
        { id: '5', cols: ['PST-4563', 'Quality control standards', 'Jose Rizal', '121', '15', 'Feb 16, 2026'] },
      ]},
    },
    activities: {
      kpis: [
        { label: 'Total Events', value: '142,567', change: 11.3, subtitle: 'All tracked events', icon: Activity, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
        { label: 'Today', value: '3,456', change: 7.8, subtitle: 'Events logged today', icon: Activity, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
        { label: 'Error Rate', value: '0.12%', change: -28.5, subtitle: 'System errors', icon: TrendingDown, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
        { label: 'Avg Response', value: '142ms', change: -5.2, subtitle: 'API response time', icon: Activity, iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
      ],
      chartTitle: 'Platform Activity', chartColor: 'cyan',
      chartData: [
        { period: 'Jan', value: 10200 }, { period: 'Feb', value: 11500 }, { period: 'Mar', value: 12800 },
        { period: 'Apr', value: 11900 }, { period: 'May', value: 13200 }, { period: 'Jun', value: 14500 },
        { period: 'Jul', value: 12300 }, { period: 'Aug', value: 13800 }, { period: 'Sep', value: 11200 },
        { period: 'Oct', value: 12700 }, { period: 'Nov', value: 14100 }, { period: 'Dec', value: 14567 },
      ],
      progressA: { title: 'Event Categories', subtitle: 'Activity type breakdown', items: [
        { label: 'Page Views', value: 85534, max: 142567, description: 'Navigation events' },
        { label: 'API Calls', value: 42770, max: 142567, description: 'Backend requests' },
        { label: 'User Actions', value: 14263, max: 142567, description: 'Clicks, forms, uploads' },
      ]},
      progressB: { title: 'System Health', subtitle: 'Infrastructure metrics', items: [
        { label: 'Uptime', value: 9997, max: 10000, description: '99.97% availability' },
        { label: 'Success Rate', value: 9988, max: 10000, description: '99.88% requests OK' },
        { label: 'Cache Hit', value: 8500, max: 10000, description: '85% cache efficiency' },
      ]},
      donut: { title: 'Traffic Source', slices: [{ label: 'Mobile', value: 52, color: '#06b6d4' }, { label: 'Desktop', value: 35, color: '#67e8f9' }, { label: 'Tablet', value: 13, color: '#a5f3fc' }] },
      table: { headers: ['Event ID', 'Type', 'User', 'Action', 'Status', 'Timestamp'], rows: [
        { id: '1', cols: ['EVT-142567', 'API', 'System', 'GET /api/products', 'Success', '2026-02-18 14:32:15'] },
        { id: '2', cols: ['EVT-142566', 'Auth', 'Juan dela Cruz', 'Login', 'Success', '2026-02-18 14:30:42'] },
        { id: '3', cols: ['EVT-142565', 'Scan', 'Maria Santos', 'Image Upload', 'Success', '2026-02-18 14:28:19'] },
        { id: '4', cols: ['EVT-142564', 'Order', 'Pedro Reyes', 'Checkout', 'Success', '2026-02-18 14:25:03'] },
        { id: '5', cols: ['EVT-142563', 'API', 'System', 'POST /api/scan', 'Error', '2026-02-18 14:22:45'] },
      ]},
    },
  }
}

// ────────────────────────────── SVG Mini Donut ───
function MiniDonut({ slices, size = 'w-28 h-28', onHover, onLeave }: { slices: DonutSlice[]; size?: string; onHover?: (slice: DonutSlice, i: number) => void; onLeave?: () => void }) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  const r = 40, cx = 50, cy = 50, sw = 12
  const hoverSw = 15
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null)
  let cumulative = 0
  if (slices.length <= 1) {
    return (
      <svg viewBox="0 0 100 100" className={`${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={slices[0]?.color ?? '#e2e8f0'} strokeWidth={sw}
          style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
          onMouseEnter={() => { setHoveredIdx(0); onHover?.(slices[0], 0) }}
          onMouseLeave={() => { setHoveredIdx(null); onLeave?.() }} />
      </svg>
    )
  }
  const circumference = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 100 100" className={`${size}`}>
      {slices.map((slice, i) => {
        const pct = slice.value / total
        const dashLen = circumference * pct
        const dashGap = circumference - dashLen
        const rotation = (cumulative / total) * 360 - 90
        cumulative += slice.value
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={slice.color}
            strokeWidth={hoveredIdx === i ? hoverSw : sw}
            strokeDasharray={`${dashLen} ${dashGap}`} transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ cursor: 'pointer', transition: 'stroke-width 0.2s, opacity 0.2s', opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 1 }}
            onMouseEnter={() => { setHoveredIdx(i); onHover?.(slice, i) }}
            onMouseLeave={() => { setHoveredIdx(null); onLeave?.() }} />
        )
      })}
    </svg>
  )
}

// ─── Column Helpers ──────────
const usersColumnHelper = createColumnHelper<AdminUser>()
const marketColumnHelper = createColumnHelper<AdminMarketProduct>()

// ──────────────────────────────── Main Component ─
export default function AdminDashboardPageNew() {
  const [activeSection, setActiveSection] = useState<SectionKey>('users')
  const [reportPanelOpen, setReportPanelOpen] = useState(false)

  // ─── Generic section state ───
  const [genericSearch, setGenericSearch] = useState('')
  const [genericPage, setGenericPage] = useState(1)
  const genericPageSize = 10
  const sampleData = useMemo(() => buildSampleData(), [])

  // ═══════════════════ USERS STATE ═══════════════════
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [usersKpis, setUsersKpis] = useState<AdminUserKpis | null>(null)
  const [usersKpisLoading, setUsersKpisLoading] = useState(false)
  const [usersChartData, setUsersChartData] = useState<AdminUserChartPoint[]>([])
  const [usersChartLoading, setUsersChartLoading] = useState(false)
  const [usersGranularity, setUsersGranularity] = useState<'week' | 'month' | 'year'>('week')
  const [usersDateRange, setUsersDateRange] = useState<DatesRangeValue>([null, null])
  const [usersCalendar, setUsersCalendar] = useState<AdminUserCalendarResponse | null>(null)
  const [usersCalendarLoading, setUsersCalendarLoading] = useState(false)
  const [usersHeatMapYear, setUsersHeatMapYear] = useState(currentYear)
  const [usersHeatMapMonth, setUsersHeatMapMonth] = useState(currentMonth)
  const [usersSegmentation, setUsersSegmentation] = useState<{ total: number; roles: Record<string, number>; statuses: Record<string, number> } | null>(null)
  const [usersTableData, setUsersTableData] = useState<AdminUser[]>([])
  const [usersTableTotal, setUsersTableTotal] = useState(0)
  const [usersTablePage, setUsersTablePage] = useState(1)
  const [usersTableSearch, setUsersTableSearch] = useState('')
  const [usersTableLoading, setUsersTableLoading] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [expandedChart, setExpandedChart] = useState(false)
  const usersTablePageSize = 10
  const [hoveredCalendarDay, setHoveredCalendarDay] = useState<{ day: number; count: number; x: number; y: number } | null>(null)
  const [donutRoleFilter, setDonutRoleFilter] = useState<'all' | 'user' | 'seller' | 'admin'>('all')
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState<{ label: string; value: number; color: string; count: number } | null>(null)

  // ═══════════════════ MARKET STATE ═══════════════════
  const [marketKpis, setMarketKpis] = useState<AdminMarketKpis | null>(null)
  const [marketKpisLoading, setMarketKpisLoading] = useState(false)
  const [marketChartData, setMarketChartData] = useState<AdminMarketChartPoint[]>([])
  const [marketChartLoading, setMarketChartLoading] = useState(false)
  const [marketGranularity, setMarketGranularity] = useState<'week' | 'month' | 'year'>('week')
  const [marketDateRange, setMarketDateRange] = useState<DatesRangeValue>([null, null])
  const [marketSegmentation, setMarketSegmentation] = useState<AdminMarketSegmentation | null>(null)
  const [marketTableData, setMarketTableData] = useState<AdminMarketProduct[]>([])
  const [marketTableTotal, setMarketTableTotal] = useState(0)
  const [marketTablePage, setMarketTablePage] = useState(1)
  const [marketTableSearch, setMarketTableSearch] = useState('')
  const [marketTableLoading, setMarketTableLoading] = useState(false)
  const [marketSortState, setMarketSortState] = useState<SortingState>([])
  const [marketSellerFilter, setMarketSellerFilter] = useState('all')
  const [marketCategoryFilter, setMarketCategoryFilter] = useState('all')
  const [marketStatusFilter, setMarketStatusFilter] = useState('all')
  const [marketSellers, setMarketSellers] = useState<{ id: string; name: string }[]>([])
  const [marketCategories, setMarketCategories] = useState<string[]>([])
  const [marketChartSellerFilter, setMarketChartSellerFilter] = useState('all')
  const [expandedMarketChart, setExpandedMarketChart] = useState(false)
  const marketTablePageSize = 10

  // ═══════════════════ USERS DATA LOADERS ═══════════════════
  const loadUsersKpis = useCallback(async () => {
    setUsersKpisLoading(true)
    try { const res = await getAdminUserKpis(); setUsersKpis(res.kpis) }
    catch (e) { console.error('Failed to load user KPIs:', e) }
    finally { setUsersKpisLoading(false) }
  }, [])

  const loadUsersChart = useCallback(async (gran: 'week' | 'month' | 'year', range: DatesRangeValue) => {
    setUsersChartLoading(true)
    try {
      const fmt = (d: Date) => d.toISOString().split('T')[0]
      let res
      if (range[0] && range[1]) {
        const s = range[0] instanceof Date ? range[0] : new Date(range[0])
        const e = range[1] instanceof Date ? range[1] : new Date(range[1])
        res = await getAdminUserChart({ granularity: 'daily', start_date: fmt(s), end_date: fmt(e) })
      } else if (gran === 'week') { res = await getAdminUserChart({ granularity: 'daily', days: 7 }) }
      else if (gran === 'month') { res = await getAdminUserChart({ granularity: 'monthly' }) }
      else { res = await getAdminUserChart({ granularity: 'yearly' }) }
      setUsersChartData(res.data)
    } catch (e) { console.error('Failed to load user chart:', e) }
    finally { setUsersChartLoading(false) }
  }, [])

  const loadUsersCalendar = useCallback(async (year: number, month: number) => {
    setUsersCalendarLoading(true)
    try { const res = await getAdminUserCalendar(year, month); setUsersCalendar(res) }
    catch (e) { console.error('Failed to load user calendar:', e) }
    finally { setUsersCalendarLoading(false) }
  }, [])

  const loadUsersSegmentation = useCallback(async () => {
    try {
      const res = await getAdminUserSegmentation()
      setUsersSegmentation({ total: res.total, roles: res.roles, statuses: res.statuses })
    } catch (e) { console.error('Failed to load user segmentation:', e) }
  }, [])

  const loadUsersTable = useCallback(async (page: number, search: string) => {
    setUsersTableLoading(true)
    try { const res = await getAdminUsers(page, usersTablePageSize, 'all', 'all', search); setUsersTableData(res.users); setUsersTableTotal(res.total) }
    catch (e) { console.error('Failed to load users table:', e) }
    finally { setUsersTableLoading(false) }
  }, [])

  // ═══════════════════ MARKET DATA LOADERS ═══════════════════
  const loadMarketKpis = useCallback(async () => {
    setMarketKpisLoading(true)
    try { const res = await getAdminMarketKpis(); setMarketKpis(res.kpis) }
    catch (e) { console.error('Failed to load market KPIs:', e) }
    finally { setMarketKpisLoading(false) }
  }, [])

  const loadMarketChart = useCallback(async (gran: 'week' | 'month' | 'year', range: DatesRangeValue, sellerId?: string) => {
    setMarketChartLoading(true)
    try {
      const fmt = (d: Date) => d.toISOString().split('T')[0]
      const params: Record<string, any> = {}
      if (sellerId && sellerId !== 'all') params.seller_id = sellerId
      if (range[0] && range[1]) {
        const s = range[0] instanceof Date ? range[0] : new Date(range[0])
        const e = range[1] instanceof Date ? range[1] : new Date(range[1])
        Object.assign(params, { granularity: 'daily', start_date: fmt(s), end_date: fmt(e) })
      } else if (gran === 'week') { Object.assign(params, { granularity: 'daily', days: 7 }) }
      else if (gran === 'month') { Object.assign(params, { granularity: 'monthly' }) }
      else { Object.assign(params, { granularity: 'yearly' }) }
      const res = await getAdminMarketChart(params)
      setMarketChartData(res.data)
    } catch (e) { console.error('Failed to load market chart:', e) }
    finally { setMarketChartLoading(false) }
  }, [])

  const loadMarketSegmentation = useCallback(async () => {
    try { const res = await getAdminMarketSegmentation(); setMarketSegmentation(res) }
    catch (e) { console.error('Failed to load market segmentation:', e) }
  }, [])

  const loadMarketTable = useCallback(async (page: number, search: string, seller: string, category: string, status: string) => {
    setMarketTableLoading(true)
    try {
      const res = await getAdminMarketTable({ page, page_size: marketTablePageSize, search: search || undefined, seller_id: seller !== 'all' ? seller : undefined, category: category !== 'all' ? category : undefined, status: status !== 'all' ? status : undefined })
      setMarketTableData(res.products); setMarketTableTotal(res.total)
      if (res.sellers) setMarketSellers(res.sellers)
      if (res.categories) setMarketCategories(res.categories)
    } catch (e) { console.error('Failed to load market table:', e) }
    finally { setMarketTableLoading(false) }
  }, [])

  // ═══════════════════ EFFECTS ═══════════════════
  useEffect(() => {
    if (activeSection === 'users') {
      loadUsersKpis(); loadUsersChart(usersGranularity, usersDateRange)
      loadUsersCalendar(usersHeatMapYear, usersHeatMapMonth)
      loadUsersSegmentation(); loadUsersTable(1, '')
    } else if (activeSection === 'market') {
      loadMarketKpis(); loadMarketChart(marketGranularity, marketDateRange, marketChartSellerFilter)
      loadMarketSegmentation(); loadMarketTable(1, '', 'all', 'all', 'all')
    }
  }, [activeSection]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSection === 'users' && !usersDateRange[0] && !usersDateRange[1]) loadUsersChart(usersGranularity, [null, null])
  }, [usersGranularity]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSection === 'users') loadUsersCalendar(usersHeatMapYear, usersHeatMapMonth)
  }, [usersHeatMapYear, usersHeatMapMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSection === 'users') loadUsersTable(usersTablePage, usersTableSearch)
  }, [usersTablePage, usersTableSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSection === 'market' && !marketDateRange[0] && !marketDateRange[1]) loadMarketChart(marketGranularity, [null, null], marketChartSellerFilter)
  }, [marketGranularity, marketChartSellerFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSection === 'market') loadMarketTable(marketTablePage, marketTableSearch, marketSellerFilter, marketCategoryFilter, marketStatusFilter)
  }, [marketTablePage, marketTableSearch, marketSellerFilter, marketCategoryFilter, marketStatusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════ USERS HANDLERS ═══════════════════
  const handleUsersToggleGranularity = () => {
    const next = usersGranularity === 'week' ? 'month' : usersGranularity === 'month' ? 'year' : 'week'
    setUsersGranularity(next); setUsersDateRange([null, null])
  }
  const handleUsersDateRangeChange = (val: DatesRangeValue) => {
    setUsersDateRange(val)
    if (val[0] && val[1]) loadUsersChart(usersGranularity, val)
    else if (!val[0] && !val[1]) loadUsersChart(usersGranularity, [null, null])
  }

  // ═══════════════════ MARKET HANDLERS ═══════════════════
  const handleMarketToggleGranularity = () => {
    const next = marketGranularity === 'week' ? 'month' : marketGranularity === 'month' ? 'year' : 'week'
    setMarketGranularity(next); setMarketDateRange([null, null])
  }
  const handleMarketDateRangeChange = (val: DatesRangeValue) => {
    setMarketDateRange(val)
    if (val[0] && val[1]) loadMarketChart(marketGranularity, val, marketChartSellerFilter)
    else if (!val[0] && !val[1]) loadMarketChart(marketGranularity, [null, null], marketChartSellerFilter)
  }

  // ─── TanStack Table for Users ───
  const usersColumns = useMemo(() => [
    usersColumnHelper.accessor('name', {
      header: 'Name',
      cell: info => (
        <div className="flex items-center gap-2">
          {info.row.original.avatar ? (
            <img src={info.row.original.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              {info.getValue()?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <span className="font-medium text-slate-800 text-sm">{info.getValue()}</span>
        </div>
      ),
    }),
    usersColumnHelper.accessor('email', { header: 'Email', cell: info => <span className="text-sm text-slate-600">{info.getValue()}</span> }),
    usersColumnHelper.accessor('role', { header: 'Role', cell: info => <Badge size="sm" variant="light" color={info.getValue() === 'admin' ? 'violet' : info.getValue() === 'seller' ? 'blue' : 'gray'}>{info.getValue()}</Badge> }),
    usersColumnHelper.accessor('status', { header: 'Status', cell: info => <Badge size="sm" variant="light" color={info.getValue() === 'active' ? 'green' : 'red'}>{info.getValue()}</Badge> }),
    usersColumnHelper.accessor('joined_at', { header: 'Joined', cell: info => { const val = info.getValue(); return <span className="text-xs text-slate-500">{val ? new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span> } }),
  ], [])

  const usersTable = useReactTable({ data: usersTableData, columns: usersColumns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() })

  // ─── TanStack Table for Market ───
  const marketColumns = useMemo(() => [
    marketColumnHelper.accessor('name', { header: 'Product', cell: info => <span className="font-medium text-slate-800 text-sm">{info.getValue()}</span> }),
    marketColumnHelper.accessor('seller_name', { header: 'Seller', cell: info => <span className="text-sm text-slate-600">{info.getValue()}</span> }),
    marketColumnHelper.accessor('category_name', { header: 'Category', cell: info => <Badge size="sm" variant="light" color="blue">{info.getValue()}</Badge> }),
    marketColumnHelper.accessor('price', { header: 'Price', cell: info => <span className="text-sm font-semibold text-slate-800">₱{info.getValue().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> }),
    marketColumnHelper.accessor('stock_qty', { header: 'Stock', cell: info => <span className={`text-sm font-medium ${info.getValue() <= 0 ? 'text-red-600' : info.getValue() < 10 ? 'text-amber-600' : 'text-slate-700'}`}>{info.getValue()}</span> }),
    marketColumnHelper.accessor('sold_count', { header: 'Sold', cell: info => <span className="text-sm text-slate-600">{info.getValue()}</span> }),
    marketColumnHelper.accessor('status', { header: 'Status', cell: info => <Badge size="sm" variant="light" color={info.getValue() === 'available' ? 'green' : info.getValue() === 'out_of_stock' ? 'red' : 'gray'}>{info.getValue() === 'out_of_stock' ? 'Out of Stock' : info.getValue()}</Badge> }),
  ], [])

  const marketTable = useReactTable({ data: marketTableData, columns: marketColumns, state: { sorting: marketSortState }, onSortingChange: setMarketSortState, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() })

  // ─── Generic section helpers ───
  const genericData = (activeSection !== 'users' && activeSection !== 'market') ? sampleData[activeSection as 'scans' | 'community' | 'activities'] : null
  const genericFilteredRows = useMemo(() => {
    if (!genericData) return []
    if (!genericSearch.trim()) return genericData.table.rows
    const q = genericSearch.toLowerCase()
    return genericData.table.rows.filter(row => row.cols.some(c => c.toLowerCase().includes(q)))
  }, [genericData, genericSearch])
  const genericTotalPages = Math.max(1, Math.ceil(genericFilteredRows.length / genericPageSize))
  const genericPaginatedRows = genericFilteredRows.slice((genericPage - 1) * genericPageSize, genericPage * genericPageSize)

  const handleSectionChange = (key: SectionKey) => { setActiveSection(key); setGenericSearch(''); setGenericPage(1) }

  // ─── Report Data Builder ───
  const usersReportData: SectionData = useMemo(() => {
    const kpis: KpiItem[] = usersKpis ? [
      { label: 'Total Users', value: usersKpis.total_users.toLocaleString(), change: usersKpis.total_change, subtitle: 'All registered accounts', icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
      { label: 'Active Users', value: usersKpis.active_users.toLocaleString(), change: usersKpis.active_change, subtitle: 'Not disabled', icon: Activity, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
      { label: 'Verified Sellers', value: usersKpis.verified_sellers.toLocaleString(), change: usersKpis.sellers_change, subtitle: 'Active seller accounts', icon: ShoppingBag, iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
      { label: 'Disabled Users', value: usersKpis.disabled_users.toLocaleString(), change: usersKpis.disabled_change, subtitle: 'Deactivated accounts', icon: TrendingDown, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
    ] : []
    return {
      kpis, chartTitle: 'User Signups', chartData: usersChartData.map(d => ({ period: d.period, value: d['New Users'] })), chartColor: 'blue',
      progressA: { title: 'User Segmentation', subtitle: 'Breakdown by role', items: usersSegmentation ? Object.entries(usersSegmentation.roles).map(([label, value]) => ({ label, value, max: usersSegmentation.total, description: `${((value / (usersSegmentation.total || 1)) * 100).toFixed(1)}% of total` })) : [] },
      progressB: { title: 'Account Status', subtitle: 'Active vs inactive', items: usersSegmentation ? Object.entries(usersSegmentation.statuses).map(([label, value]) => ({ label, value, max: usersSegmentation.total, description: `${((value / (usersSegmentation.total || 1)) * 100).toFixed(1)}% of total` })) : [] },
      donut: { title: 'User Roles', slices: usersSegmentation ? [{ label: 'Regular', value: usersSegmentation.roles['Regular Users'] || 0, color: '#3b82f6' }, { label: 'Sellers', value: usersSegmentation.roles['Sellers'] || 0, color: '#22c55e' }, { label: 'Admins', value: usersSegmentation.roles['Admins'] || 0, color: '#ef4444' }] : [] },
      table: { headers: ['Name', 'Email', 'Role', 'Status', 'Joined'], rows: usersTableData.map(u => ({ id: u.id, cols: [u.name, u.email, u.role, u.status, u.joined_at ? new Date(u.joined_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'] })) },
    }
  }, [usersKpis, usersChartData, usersSegmentation, usersTableData])

  const marketReportData: SectionData = useMemo(() => {
    const kpis: KpiItem[] = marketKpis ? [
      { label: 'Total Revenue', value: `₱${marketKpis.total_revenue.toLocaleString()}`, change: marketKpis.revenue_change, subtitle: 'From delivered orders', icon: DollarSign, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
      { label: 'Total Orders', value: marketKpis.total_orders.toLocaleString(), change: marketKpis.orders_change, subtitle: 'All orders', icon: ShoppingBag, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
      { label: 'Active Products', value: marketKpis.active_products.toLocaleString(), change: 0, subtitle: 'Available listings', icon: Package, iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
      { label: 'Avg Order Value', value: `₱${marketKpis.avg_order_value.toLocaleString()}`, change: 0, subtitle: 'Per transaction', icon: BarChart3, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    ] : []
    return {
      kpis, chartTitle: 'Market Revenue', chartData: marketChartData.map(d => ({ period: d.period, value: d.Revenue })), chartColor: 'green',
      progressA: { title: 'Order Status', subtitle: 'Order breakdown', items: marketSegmentation ? Object.entries(marketSegmentation.order_statuses).map(([label, value]) => ({ label, value, max: marketSegmentation.total_orders || 1, description: `${((value / (marketSegmentation.total_orders || 1)) * 100).toFixed(1)}%` })) : [] },
      progressB: { title: 'Categories', subtitle: 'Products by category', items: marketSegmentation ? Object.entries(marketSegmentation.category_breakdown).slice(0, 5).map(([label, value]) => {
        const total = Object.values(marketSegmentation.category_breakdown).reduce((a, b) => a + b, 0)
        return { label, value, max: total || 1, description: `${((value / (total || 1)) * 100).toFixed(1)}%` }
      }) : [] },
      donut: { title: 'Order Status', slices: marketSegmentation ? Object.entries(marketSegmentation.order_statuses).map(([label, value], i) => ({ label, value, color: ['#22c55e', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'][i] || '#94a3b8' })) : [] },
      table: { headers: ['Product', 'Seller', 'Category', 'Price', 'Stock', 'Sold', 'Status'], rows: marketTableData.map(p => ({ id: p.id, cols: [p.name, p.seller_name, p.category_name, `₱${p.price.toLocaleString()}`, String(p.stock_qty), String(p.sold_count), p.status] })) },
    }
  }, [marketKpis, marketChartData, marketSegmentation, marketTableData])

  const reportData: SectionData = activeSection === 'users' ? usersReportData
    : activeSection === 'market' ? marketReportData
    : sampleData[activeSection as 'scans' | 'community' | 'activities']

  // ─── Users Donut with filter ───
  const usersDonutSlices: DonutSlice[] = useMemo(() => {
    if (!usersSegmentation) return []
    const total = usersSegmentation.total || 1
    const all = [
      { label: 'Regular Users', value: Math.round(((usersSegmentation.roles['Regular Users'] || 0) / total) * 100), color: '#3b82f6' },
      { label: 'Sellers', value: Math.round(((usersSegmentation.roles['Sellers'] || 0) / total) * 100), color: '#22c55e' },
      { label: 'Admins', value: Math.round(((usersSegmentation.roles['Admins'] || 0) / total) * 100), color: '#ef4444' },
    ]
    if (donutRoleFilter === 'all') return all
    if (donutRoleFilter === 'user') return [all[0]]
    if (donutRoleFilter === 'seller') return [all[1]]
    return [all[2]]
  }, [usersSegmentation, donutRoleFilter])

  const usersTotalPages = Math.max(1, Math.ceil(usersTableTotal / usersTablePageSize))
  const marketTotalPages = Math.max(1, Math.ceil(marketTableTotal / marketTablePageSize))

  // ─── Calendar stats (to fill whitespace) ───
  const calendarStats = useMemo(() => {
    if (!usersCalendar?.weeks) return { total: 0, max: 0, avg: 0, activeDays: 0 }
    const days = usersCalendar.weeks.flat().filter(d => d.day !== null)
    const total = days.reduce((s, d) => s + d.count, 0)
    const activeDays = days.filter(d => d.count > 0).length
    return { total, max: usersCalendar.max_count, avg: activeDays > 0 ? (total / activeDays).toFixed(1) : '0', activeDays }
  }, [usersCalendar])

  // ─── Market donut slices ───
  const marketCategoryDonut: DonutSlice[] = useMemo(() => {
    if (!marketSegmentation) return []
    const entries = Object.entries(marketSegmentation.category_breakdown)
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1
    const colors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#94a3b8']
    return entries.slice(0, 6).map(([label, value], i) => ({ label, value: Math.round((value / total) * 100), color: colors[i] || '#94a3b8' }))
  }, [marketSegmentation])

  // ═══════════════════ PAGINATION COMPONENT ═══════════════════
  const PaginationBar = ({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total: number; onPageChange: (p: number) => void }) => (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
      <p className="text-xs text-slate-500">Page {page} of {totalPages} ({total} total)</p>
      <div className="flex items-center gap-1">
        <ActionIcon variant="subtle" color="gray" size="sm" disabled={page === 1} onClick={() => onPageChange(1)}>
          <ChevronLeft className="w-3.5 h-3.5" /><ChevronLeft className="w-3.5 h-3.5 -ml-2" />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="sm" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </ActionIcon>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4))
          const pn = start + i
          if (pn > totalPages) return null
          return <button key={pn} onClick={() => onPageChange(pn)} className={`w-7 h-7 rounded text-xs font-medium transition-colors ${pn === page ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{pn}</button>
        })}
        <ActionIcon variant="subtle" color="gray" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
          <ChevronRight className="w-3.5 h-3.5" />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronRight className="w-3.5 h-3.5" /><ChevronRight className="w-3.5 h-3.5 -ml-2" />
        </ActionIcon>
      </div>
    </div>
  )

  // ═══════════════════ RENDER ═══════════════════
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">

        {/* Breadcrumb */}
        <div className="text-sm text-slate-500 mb-3">
          <span>Pages</span><span className="mx-2">/</span><span className="text-slate-700 font-medium">Admin Dashboard</span>
        </div>

        {/* Header Row */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-2">Platform analytics, monitoring, and management</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <div className="relative">
              <button onClick={() => setReportPanelOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 shadow-md"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}>
                <Download className="w-4 h-4" /> Download Report
              </button>
              <AdminReportPanel open={reportPanelOpen} onClose={() => setReportPanelOpen(false)} section={activeSection}
                sectionLabel={SECTIONS.find(s => s.key === activeSection)?.label ?? ''} data={reportData} />
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm w-fit">
            {SECTIONS.map(sec => {
              const Icon = sec.icon; const isActive = activeSection === sec.key
              return (
                <button key={sec.key} onClick={() => handleSectionChange(sec.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}>
                  <Icon className="w-4 h-4" />{sec.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ══════════════════ USERS SECTION ══════════════════ */}
        {activeSection === 'users' && (
          <div className="space-y-4">
            {/* ROW 1: KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {usersKpisLoading ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-300 rounded-xl p-4 min-h-[130px] animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-24 mb-3" /><div className="h-7 bg-slate-200 rounded w-20 mb-2" /><div className="h-3 bg-slate-200 rounded w-32" />
                </div>
              )) : usersKpis ? (<>
                <KpiCard icon={<Users className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" emoji="👥" title="Total Users"
                  value={usersKpis.total_users.toLocaleString()} badge={<DynamicPercentageBadge value={usersKpis.total_change} size="xs" />}
                  badgeLabel="vs last 30 days" description="Total number of registered accounts on the platform" />
                <KpiCard icon={<Activity className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" emoji="✅" title="Active Users"
                  value={usersKpis.active_users.toLocaleString()} badge={<DynamicPercentageBadge value={usersKpis.active_change} size="xs" />}
                  badgeLabel="vs last 30 days" description="Users whose accounts are not disabled or deactivated" />
                <KpiCard icon={<ShoppingBag className="w-5 h-5 text-violet-600" />} iconBg="bg-violet-100" emoji="🏪" title="Verified Sellers"
                  value={usersKpis.verified_sellers.toLocaleString()} badge={<DynamicPercentageBadge value={usersKpis.sellers_change} size="xs" />}
                  badgeLabel="vs last 30 days" description="Active seller accounts with marketplace access" />
                <KpiCard icon={<UserX className="w-5 h-5 text-red-600" />} iconBg="bg-red-100" emoji="🚫" title="Disabled Users"
                  value={usersKpis.disabled_users.toLocaleString()} badge={<DynamicPercentageBadge value={usersKpis.disabled_change} size="xs" />}
                  badgeLabel="vs last 30 days" description="Accounts that have been deactivated by administrators" />
              </>) : null}
            </div>

            {/* ROW 2: Bar Chart — Blue=Users, Green=Sellers, Red=Admins */}
            <div className="bg-white border border-slate-300 rounded-xl p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-900 font-bold">📈 User Signups</p>
                  <p className="text-xs text-slate-500 mt-1">{usersGranularity === 'week' ? 'Daily signups (last 7 days)' : usersGranularity === 'month' ? 'Monthly signups (this year)' : 'Yearly signups (last 5 years)'}</p>
                </div>
                <Group gap="xs">
                  <Button variant="default" size="xs" onClick={handleUsersToggleGranularity} className="text-xs font-medium min-w-[62px]">
                    {usersGranularity === 'week' ? 'Week' : usersGranularity === 'month' ? 'Month' : 'Year'}
                  </Button>
                  <DatePickerInput type="range" placeholder="Date range" value={usersDateRange} onChange={handleUsersDateRangeChange}
                    leftSection={<Calendar className="w-4 h-4" />} size="xs" clearable maxDate={new Date()}
                    styles={{ input: { border: '1px solid rgb(203 213 225)', borderRadius: '0.5rem', fontSize: '0.875rem' } }} />
                  <ActionIcon variant="default" onClick={() => setExpandedChart(true)}><Maximize2 className="w-4 h-4" /></ActionIcon>
                </Group>
              </div>
              {usersChartLoading ? (
                <div className="h-64 flex items-center justify-center"><span className="text-slate-500">Loading chart...</span></div>
              ) : (
                <BarChart className="h-64" data={usersChartData} index="period"
                  categories={['New Users', 'New Sellers', 'New Admins']} colors={['blue', 'green', 'red']}
                  showAnimation showLegend showGridLines valueFormatter={(v: number) => v.toLocaleString()} onValueChange={() => {}} />
              )}
            </div>

            {/* Expanded chart modal */}
            <Modal opened={expandedChart} onClose={() => setExpandedChart(false)} size="90%" title={<span className="font-bold text-lg">User Signups — Expanded</span>} centered>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="default" size="xs" onClick={handleUsersToggleGranularity}>{usersGranularity === 'week' ? 'Week' : usersGranularity === 'month' ? 'Month' : 'Year'}</Button>
                  <DatePickerInput type="range" placeholder="Date range" value={usersDateRange} onChange={handleUsersDateRangeChange}
                    leftSection={<Calendar className="w-4 h-4" />} size="xs" clearable maxDate={new Date()} />
                </div>
                <BarChart className="h-[500px]" data={usersChartData} index="period"
                  categories={['New Users', 'New Sellers', 'New Admins']} colors={['blue', 'green', 'red']}
                  showAnimation showLegend showGridLines valueFormatter={(v: number) => v.toLocaleString()} onValueChange={() => {}} />
              </div>
            </Modal>

            {/* ROW 3: Segmentation + Calendar Heatmap + Role Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* User Segmentation */}
              <div className="bg-white border border-slate-300 rounded-xl p-4">
                <p className="text-xs text-slate-900 font-bold">📊 User Segmentation</p>
                <p className="text-[10px] text-slate-500 mb-4 italic">Breakdown by role and status</p>
                {usersSegmentation ? (
                  <div className="space-y-4">
                    {Object.entries(usersSegmentation.roles).map(([label, value], i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{label}</span>
                          <span className="text-xs font-semibold text-slate-700">{value.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (value / (usersSegmentation.total || 1)) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-500 italic mt-1">{((value / (usersSegmentation.total || 1)) * 100).toFixed(1)}% of total</p>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 pt-3 mt-3">
                      <p className="text-[10px] font-bold text-slate-700 mb-2 uppercase tracking-wide">Account Status</p>
                      {Object.entries(usersSegmentation.statuses).map(([label, value], i) => (
                        <div key={i} className="mb-2.5">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">{label}</span>
                            <span className="text-xs font-semibold text-slate-700">{value.toLocaleString()}</span>
                          </div>
                          <div className={`w-full h-2.5 ${label === 'Active' ? 'bg-green-100' : 'bg-red-100'} rounded-full overflow-hidden`}>
                            <div className={`h-full ${label === 'Active' ? 'bg-green-500' : 'bg-red-500'} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, (value / (usersSegmentation.total || 1)) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Loading...</div>}
              </div>

              {/* Calendar Heatmap with Tooltip */}
              <div className="bg-white border border-slate-300 rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-900 font-bold">📅 Signup Calendar</p>
                </div>
                <p className="text-[10px] text-slate-500 mb-3 italic">Daily new user signups heatmap</p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <select value={usersHeatMapYear} onChange={(e) => setUsersHeatMapYear(Number(e.target.value))}
                    className="px-2 py-1 border border-blue-300 shadow-sm bg-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded">
                    {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={usersHeatMapMonth} onChange={(e) => setUsersHeatMapMonth(Number(e.target.value))}
                    className="px-2 py-1 border border-blue-300 shadow-sm bg-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded">
                    {[{ val: 1, name: 'Jan' }, { val: 2, name: 'Feb' }, { val: 3, name: 'Mar' }, { val: 4, name: 'Apr' }, { val: 5, name: 'May' },
                      { val: 6, name: 'Jun' }, { val: 7, name: 'Jul' }, { val: 8, name: 'Aug' }, { val: 9, name: 'Sep' }, { val: 10, name: 'Oct' },
                      { val: 11, name: 'Nov' }, { val: 12, name: 'Dec' }].map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
                  </select>
                  <div className="text-[10px] text-slate-500 ml-auto">{usersCalendar ? `0 — ${usersCalendar.max_count} signups` : '0 — 0'}</div>
                </div>
                {usersCalendarLoading ? (
                  <div className="h-32 flex items-center justify-center text-sm text-slate-500">Loading...</div>
                ) : usersCalendar && usersCalendar.weeks ? (
                  <div className="space-y-1">
                    <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="text-center">{d}</div>)}
                    </div>
                    {usersCalendar.weeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="grid grid-cols-7 gap-1">
                        {week.map((day, dayIdx) => {
                          const maxCount = usersCalendar.max_count || 1
                          const intensity = day.day !== null && day.count > 0 ? Math.min(day.count / maxCount, 1) : 0
                          return (
                            <Tooltip key={dayIdx} label={day.day !== null ? `${usersCalendar.month_name} ${day.day}: ${day.count} signup${day.count !== 1 ? 's' : ''}` : ''} disabled={day.day === null} position="top" withArrow>
                              <div
                                className={`h-7 border border-slate-200 flex items-center justify-center text-[9px] font-medium rounded-sm cursor-default transition-transform hover:scale-110 ${
                                  day.day === null ? 'bg-slate-50' :
                                  intensity > 0.7 ? 'bg-blue-600 text-white' :
                                  intensity > 0.4 ? 'bg-blue-400 text-white' :
                                  intensity > 0 ? 'bg-blue-200 text-blue-900' :
                                  'bg-blue-50 text-slate-400'
                                }`}
                              >
                                {day.day !== null ? (day.count || '') : ''}
                              </div>
                            </Tooltip>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ) : <div className="h-32 flex items-center justify-center text-sm text-slate-500">No data</div>}

                {/* Calendar statistics to fill whitespace */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{calendarStats.total}</p>
                    <p className="text-[10px] text-slate-500">Total Signups</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{calendarStats.max}</p>
                    <p className="text-[10px] text-slate-500">Peak Day</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{calendarStats.avg}</p>
                    <p className="text-[10px] text-slate-500">Avg / Active Day</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{calendarStats.activeDays}</p>
                    <p className="text-[10px] text-slate-500">Active Days</p>
                  </div>
                </div>
              </div>

              {/* User Roles Donut with radio filter */}
              <div className="bg-white border border-slate-300 rounded-xl p-4">
                <p className="text-xs text-slate-900 font-bold">🍩 User Roles</p>
                <p className="text-[10px] text-slate-500 mb-3 italic">Distribution by role</p>

                {/* Radio Buttons */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {([
                    { key: 'all' as const, label: 'All', color: 'bg-slate-600' },
                    { key: 'user' as const, label: 'Users', color: 'bg-blue-500' },
                    { key: 'seller' as const, label: 'Sellers', color: 'bg-green-500' },
                    { key: 'admin' as const, label: 'Admins', color: 'bg-red-500' },
                  ]).map(opt => (
                    <button key={opt.key} onClick={() => setDonutRoleFilter(opt.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        donutRoleFilter === opt.key ? `${opt.color} text-white shadow-sm` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      <div className={`w-2 h-2 rounded-full ${donutRoleFilter === opt.key ? 'bg-white' : opt.color}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Larger Donut with Hover Tooltip */}
                <div className="flex flex-col items-center relative">
                  <div className="w-40 h-40 relative">
                    <MiniDonut slices={usersDonutSlices} size="w-40 h-40"
                      onHover={(slice, i) => {
                        const count = usersSegmentation
                          ? (slice.label === 'Regular Users' ? usersSegmentation.roles['Regular Users'] : slice.label === 'Sellers' ? usersSegmentation.roles['Sellers'] : usersSegmentation.roles['Admins']) || 0
                          : 0
                        setHoveredDonutSlice({ label: slice.label, value: slice.value, color: slice.color, count })
                      }}
                      onLeave={() => setHoveredDonutSlice(null)}
                    />
                    {/* Center tooltip */}
                    {hoveredDonutSlice && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white/95 border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-center">
                          <div className="flex items-center gap-1.5 justify-center mb-0.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredDonutSlice.color }} />
                            <span className="text-[11px] font-semibold text-slate-800">{hoveredDonutSlice.label}</span>
                          </div>
                          <p className="text-lg font-bold text-slate-900">{hoveredDonutSlice.value}%</p>
                          <p className="text-[10px] text-slate-500">{hoveredDonutSlice.count.toLocaleString()} users</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 w-full space-y-2">
                    {usersDonutSlices.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-slate-700 flex-1">{s.label}</span>
                        <span className="text-xs font-semibold text-slate-900">{s.value}%</span>
                        {usersSegmentation && (
                          <span className="text-[10px] text-slate-400">
                            ({(donutRoleFilter === 'all'
                              ? (s.label === 'Regular Users' ? usersSegmentation.roles['Regular Users'] : s.label === 'Sellers' ? usersSegmentation.roles['Sellers'] : usersSegmentation.roles['Admins'])
                              : Object.values(usersSegmentation.roles).find((_, idx) => idx === i)
                            || 0).toLocaleString()})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {usersSegmentation && (
                    <div className="mt-3 pt-2 border-t border-slate-100 w-full text-center">
                      <p className="text-[10px] text-slate-500">Total: <span className="font-semibold text-slate-800">{usersSegmentation.total.toLocaleString()}</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 4: Users Table */}
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-900 font-bold">📋 Users Data</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{usersTableLoading ? 'Loading...' : `Showing ${usersTableData.length} of ${usersTableTotal} users`}</p>
                </div>
                <TextInput placeholder="Search users..." size="xs" radius="md" value={usersTableSearch}
                  onChange={e => { setUsersTableSearch(e.currentTarget.value); setUsersTablePage(1) }}
                  leftSection={<Search className="w-3.5 h-3.5 text-slate-400" />} className="w-64" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    {usersTable.getHeaderGroups().map(hg => (
                      <tr key={hg.id}>{hg.headers.map(header => (
                        <th key={header.id} onClick={header.column.getToggleSortingHandler()}
                          className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none">
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                          </div>
                        </th>
                      ))}</tr>
                    ))}
                  </thead>
                  <tbody>
                    {usersTableData.length === 0 && !usersTableLoading ? (
                      <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No users found</td></tr>
                    ) : usersTable.getRowModel().rows.map(row => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                        {row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={usersTablePage} totalPages={usersTotalPages} total={usersTableTotal} onPageChange={setUsersTablePage} />
            </div>
          </div>
        )}

        {/* ══════════════════ MARKET SECTION ══════════════════ */}
        {activeSection === 'market' && (
          <div className="space-y-4">
            {/* ROW 1: KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {marketKpisLoading ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-300 rounded-xl p-4 min-h-[130px] animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-24 mb-3" /><div className="h-7 bg-slate-200 rounded w-20 mb-2" /><div className="h-3 bg-slate-200 rounded w-32" />
                </div>
              )) : marketKpis ? (<>
                <KpiCard icon={<DollarSign className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-100" emoji="💰" title="Total Revenue"
                  value={`₱${marketKpis.total_revenue.toLocaleString()}`} badge={<DynamicPercentageBadge value={marketKpis.revenue_change} size="xs" />}
                  badgeLabel="vs last 30 days" description="Revenue from delivered orders only" />
                <KpiCard icon={<ShoppingBag className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" emoji="📦" title="Total Orders"
                  value={marketKpis.total_orders.toLocaleString()} badge={<DynamicPercentageBadge value={marketKpis.orders_change} size="xs" />}
                  badgeLabel="vs last 30 days" description={`Delivered: ${marketKpis.delivered_orders} · Pending: ${marketKpis.pending_orders} · Cancelled: ${marketKpis.cancelled_orders}`} />
                <KpiCard icon={<Package className="w-5 h-5 text-violet-600" />} iconBg="bg-violet-100" emoji="🏷️" title="Products & Stock"
                  value={`${marketKpis.active_products} active`}
                  badge={<Badge size="xs" variant="light" color={marketKpis.out_of_stock > 0 ? 'red' : 'green'}>{marketKpis.out_of_stock} out of stock</Badge>}
                  badgeLabel="" description={`Total stock: ${marketKpis.total_stock.toLocaleString()} units across ${marketKpis.total_products} products`} />
                <KpiCard icon={<BarChart3 className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" emoji="📊" title="Averages"
                  value={`₱${marketKpis.avg_order_value.toLocaleString()}`}
                  badge={<Badge size="xs" variant="light" color="blue">{marketKpis.active_sellers} active sellers</Badge>}
                  badgeLabel="" description={`Average order value · ${marketKpis.total_sellers} total sellers on platform`} />
              </>) : null}
            </div>

            {/* ROW 2: Market Bar Chart — Orders & Revenue */}
            <div className="bg-white border border-slate-300 rounded-xl p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-900 font-bold">📈 Market Activity</p>
                  <p className="text-xs text-slate-500 mt-1">Orders count & revenue per period</p>
                </div>
                <Group gap="xs">
                  <select value={marketChartSellerFilter} onChange={e => setMarketChartSellerFilter(e.target.value)}
                    className="px-2 py-1 border border-slate-300 bg-white text-xs rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Sellers</option>
                    {marketSellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Button variant="default" size="xs" onClick={handleMarketToggleGranularity} className="text-xs font-medium min-w-[62px]">
                    {marketGranularity === 'week' ? 'Week' : marketGranularity === 'month' ? 'Month' : 'Year'}
                  </Button>
                  <DatePickerInput type="range" placeholder="Date range" value={marketDateRange} onChange={handleMarketDateRangeChange}
                    leftSection={<Calendar className="w-4 h-4" />} size="xs" clearable maxDate={new Date()}
                    styles={{ input: { border: '1px solid rgb(203 213 225)', borderRadius: '0.5rem', fontSize: '0.875rem' } }} />
                  <ActionIcon variant="default" onClick={() => setExpandedMarketChart(true)}><Maximize2 className="w-4 h-4" /></ActionIcon>
                </Group>
              </div>
              {marketChartLoading ? (
                <div className="h-64 flex items-center justify-center"><span className="text-slate-500">Loading chart...</span></div>
              ) : (
                <BarChart className="h-64" data={marketChartData} index="period"
                  categories={['Orders', 'Revenue']} colors={['blue', 'green']}
                  showAnimation showLegend showGridLines
                  valueFormatter={(v: number) => v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : v.toLocaleString()} onValueChange={() => {}} />
              )}
            </div>

            {/* Expanded Market chart modal */}
            <Modal opened={expandedMarketChart} onClose={() => setExpandedMarketChart(false)} size="90%" title={<span className="font-bold text-lg">Market Activity — Expanded</span>} centered>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <select value={marketChartSellerFilter} onChange={e => setMarketChartSellerFilter(e.target.value)}
                    className="px-2 py-1 border border-slate-300 bg-white text-xs rounded"><option value="all">All Sellers</option>
                    {marketSellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Button variant="default" size="xs" onClick={handleMarketToggleGranularity}>{marketGranularity === 'week' ? 'Week' : marketGranularity === 'month' ? 'Month' : 'Year'}</Button>
                  <DatePickerInput type="range" placeholder="Date range" value={marketDateRange} onChange={handleMarketDateRangeChange}
                    leftSection={<Calendar className="w-4 h-4" />} size="xs" clearable maxDate={new Date()} />
                </div>
                <BarChart className="h-[500px]" data={marketChartData} index="period"
                  categories={['Orders', 'Revenue']} colors={['blue', 'green']}
                  showAnimation showLegend showGridLines
                  valueFormatter={(v: number) => v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : v.toLocaleString()} onValueChange={() => {}} />
              </div>
            </Modal>

            {/* ROW 3: Order Status + Top Sellers + Category Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Order Status Breakdown */}
              <div className="bg-white border border-slate-300 rounded-xl p-4">
                <p className="text-xs text-slate-900 font-bold">📊 Order Status</p>
                <p className="text-[10px] text-slate-500 mb-4 italic">Breakdown by order status</p>
                {marketSegmentation ? (
                  <div className="space-y-4">
                    {Object.entries(marketSegmentation.order_statuses).map(([label, value], i) => {
                      const colors = { Pending: 'bg-amber-500', Confirmed: 'bg-blue-500', Shipped: 'bg-indigo-500', Delivered: 'bg-green-500', Cancelled: 'bg-red-500' }
                      const bgColors = { Pending: 'bg-amber-100', Confirmed: 'bg-blue-100', Shipped: 'bg-indigo-100', Delivered: 'bg-green-100', Cancelled: 'bg-red-100' }
                      return (
                        <div key={i}>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">{label}</span>
                            <span className="text-xs font-semibold text-slate-700">{value.toLocaleString()}</span>
                          </div>
                          <div className={`w-full h-2.5 ${bgColors[label as keyof typeof bgColors] || 'bg-slate-100'} rounded-full overflow-hidden`}>
                            <div className={`h-full ${colors[label as keyof typeof colors] || 'bg-slate-500'} rounded-full transition-all duration-700`}
                              style={{ width: `${Math.min(100, (value / (marketSegmentation.total_orders || 1)) * 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-500 italic mt-1">{((value / (marketSegmentation.total_orders || 1)) * 100).toFixed(1)}% of total</p>
                        </div>
                      )
                    })}
                  </div>
                ) : <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Loading...</div>}
              </div>

              {/* Top Sellers */}
              <div className="bg-white border border-slate-300 rounded-xl p-4">
                <p className="text-xs text-slate-900 font-bold">🏆 Top Sellers</p>
                <p className="text-[10px] text-slate-500 mb-4 italic">By revenue (top 10)</p>
                {marketSegmentation?.top_sellers && marketSegmentation.top_sellers.length > 0 ? (
                  <div className="space-y-3">
                    {marketSegmentation.top_sellers.slice(0, 7).map((seller, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{seller.seller_name}</p>
                          <p className="text-[10px] text-slate-500">{seller.order_count} orders</p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">₱{seller.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No sellers yet</div>}
              </div>

              {/* Category Donut */}
              <div className="bg-white border border-slate-300 rounded-xl p-4">
                <p className="text-xs text-slate-900 font-bold">🍩 Products by Category</p>
                <p className="text-[10px] text-slate-500 mb-3 italic">Distribution breakdown</p>
                <div className="flex flex-col items-center">
                  <div className="w-36 h-36">
                    <MiniDonut slices={marketCategoryDonut} size="w-36 h-36" />
                  </div>
                  <div className="mt-4 w-full space-y-2">
                    {marketCategoryDonut.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-slate-700 flex-1 truncate">{s.label}</span>
                        <span className="text-xs font-semibold text-slate-900">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 4: Market Table with Filters */}
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <p className="text-xs text-slate-900 font-bold">📋 Products Data</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{marketTableLoading ? 'Loading...' : `Showing ${marketTableData.length} of ${marketTableTotal} products`}</p>
                  </div>
                  <TextInput placeholder="Search products..." size="xs" radius="md" value={marketTableSearch}
                    onChange={e => { setMarketTableSearch(e.currentTarget.value); setMarketTablePage(1) }}
                    leftSection={<Search className="w-3.5 h-3.5 text-slate-400" />} className="w-64" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-medium">Filters:</span>
                  </div>
                  <select value={marketSellerFilter} onChange={e => { setMarketSellerFilter(e.target.value); setMarketTablePage(1) }}
                    className="px-2 py-1 border border-slate-300 bg-white text-xs rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Sellers</option>
                    {marketSellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={marketCategoryFilter} onChange={e => { setMarketCategoryFilter(e.target.value); setMarketTablePage(1) }}
                    className="px-2 py-1 border border-slate-300 bg-white text-xs rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Categories</option>
                    {marketCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={marketStatusFilter} onChange={e => { setMarketStatusFilter(e.target.value); setMarketTablePage(1) }}
                    className="px-2 py-1 border border-slate-300 bg-white text-xs rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Status</option>
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  {(marketSellerFilter !== 'all' || marketCategoryFilter !== 'all' || marketStatusFilter !== 'all') && (
                    <button onClick={() => { setMarketSellerFilter('all'); setMarketCategoryFilter('all'); setMarketStatusFilter('all'); setMarketTablePage(1) }}
                      className="text-[10px] text-blue-600 hover:underline">Clear all</button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    {marketTable.getHeaderGroups().map(hg => (
                      <tr key={hg.id}>{hg.headers.map(header => (
                        <th key={header.id} onClick={header.column.getToggleSortingHandler()}
                          className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none">
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                          </div>
                        </th>
                      ))}</tr>
                    ))}
                  </thead>
                  <tbody>
                    {marketTableData.length === 0 && !marketTableLoading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No products found</td></tr>
                    ) : marketTable.getRowModel().rows.map(row => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                        {row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={marketTablePage} totalPages={marketTotalPages} total={marketTableTotal} onPageChange={setMarketTablePage} />
            </div>
          </div>
        )}

        {/* ══════════════════ GENERIC SECTIONS ══════════════════ */}
        {activeSection !== 'users' && activeSection !== 'market' && genericData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {genericData.kpis.map((kpi, i) => {
                const Icon = kpi.icon
                return <KpiCard key={i} icon={<Icon className={`w-5 h-5 ${kpi.iconColor}`} />} iconBg={kpi.iconBg}
                  title={kpi.label} value={kpi.value} badge={<DynamicPercentageBadge value={kpi.change} size="xs" />} badgeLabel="vs last period" description={kpi.subtitle} />
              })}
            </div>

            <div className="bg-white border border-slate-300 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div><p className="text-xs text-slate-900 font-bold">📈 {genericData.chartTitle}</p><p className="text-[10px] text-slate-500 mt-0.5 italic">Monthly trend over the past year</p></div>
                <Badge variant="light" color="blue" size="sm">Last 12 months</Badge>
              </div>
              <BarChart className="h-64" data={genericData.chartData} index="period" categories={['value']} colors={[genericData.chartColor]}
                showAnimation showLegend={false} showGridLines valueFormatter={(v: number) => v.toLocaleString()} onValueChange={() => {}} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[genericData.progressA, genericData.progressB].map((prog, pi) => (
                <div key={pi} className="bg-white border border-slate-300 rounded-xl p-4">
                  <p className="text-xs text-slate-900 font-bold">📊 {prog.title}</p>
                  <p className="text-[10px] text-slate-500 mb-4 italic">{prog.subtitle}</p>
                  <div className="space-y-4">
                    {prog.items.map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1"><span className="text-xs font-bold text-slate-900">{item.label}</span><span className="text-xs font-semibold text-slate-700">{item.value.toLocaleString()}</span></div>
                        <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} /></div>
                        <p className="text-[10px] text-slate-500 italic mt-1">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="bg-white border border-slate-300 rounded-xl p-4">
                <p className="text-xs text-slate-900 font-bold">🍩 {genericData.donut.title}</p>
                <p className="text-[10px] text-slate-500 mb-3 italic">Distribution breakdown</p>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-28 flex-shrink-0"><MiniDonut slices={genericData.donut.slices} /></div>
                  <div className="space-y-2 flex-1">
                    {genericData.donut.slices.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-slate-700 flex-1">{s.label}</span>
                        <span className="text-xs font-semibold text-slate-900">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div><p className="text-xs text-slate-900 font-bold">📋 {SECTIONS.find(s => s.key === activeSection)?.label} Data</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Showing {genericPaginatedRows.length} of {genericFilteredRows.length} entries</p></div>
                <TextInput placeholder="Search..." size="xs" radius="md" value={genericSearch}
                  onChange={e => { setGenericSearch(e.currentTarget.value); setGenericPage(1) }}
                  leftSection={<Search className="w-3.5 h-3.5 text-slate-400" />} className="w-64" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{genericData.table.headers.map((h, i) => <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {genericPaginatedRows.length === 0 ? (
                      <tr><td colSpan={genericData.table.headers.length} className="text-center py-8 text-slate-400 text-sm">No records found</td></tr>
                    ) : genericPaginatedRows.map(row => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                        {row.cols.map((cell, ci) => (
                          <td key={ci} className={`px-4 py-3 ${ci === 0 ? 'font-mono text-xs text-slate-600' : ci === row.cols.length - 1 ? 'text-xs text-slate-500' : 'text-sm text-slate-800'}`}>
                            {(genericData.table.headers[ci] === 'Status' || genericData.table.headers[ci] === 'Grade') ? (
                              <Badge size="sm" variant="light" color={cell === 'Active' || cell === 'Completed' || cell === 'Success' || cell === 'A' ? 'green' : cell === 'Pending' || cell === 'B' ? 'yellow' : cell === 'Cancelled' || cell === 'Error' || cell === 'C' ? 'red' : cell === 'Inactive' ? 'gray' : 'blue'}>{cell}</Badge>
                            ) : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={genericPage} totalPages={genericTotalPages} total={genericFilteredRows.length} onPageChange={setGenericPage} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
