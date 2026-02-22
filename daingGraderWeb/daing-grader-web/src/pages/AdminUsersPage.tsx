/**
 * Admin Users Management Page
 * Features: KPI dashboard with analytics graphs, collapsible tables, role filtering
 */
import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Shield,
  ShoppingBag,
  User,
  Users,
  Eye,
  X,
  Mail,
  Calendar,
  Package,
  ShoppingCart,
  ScanLine,
  AlertCircle,
  BarChart3,
  Maximize2,
} from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import {
  getAdminUsers,
  getAdminUsersStats,
  toggleUserStatus,
  getAdminUserDetail,
  type AdminUser,
  type AdminUserDetail,
  type AdminUsersStats,
} from '../services/api'

type UserRole = 'admin' | 'seller' | 'user'
type FilterRole = 'all' | UserRole

const roleIcons: Record<UserRole, React.ElementType> = {
  admin: Shield,
  seller: ShoppingBag,
  user: User,
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  seller: 'bg-blue-100 text-blue-700 border-blue-200',
  user: 'bg-slate-100 text-slate-700 border-slate-200',
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrators',
  seller: 'Sellers',
  user: 'Users',
}

/**
 * Bar Chart Component for User Role Distribution
 */
function RoleDistributionChart({ stats }: { stats: AdminUsersStats | null }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  if (!stats) return <div className="h-48 flex items-center justify-center text-slate-500">Loading...</div>

  const data = [
    { label: 'Admin', value: stats.admins, color: '#8B5CF6' },
    { label: 'Seller', value: stats.sellers, color: '#2563EB' },
    { label: 'User', value: stats.users, color: '#60A5FA' },
  ]

  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const chartHeight = 250

  return (
    <div className="space-y-2 h-full flex flex-col relative">
      <div className="flex-1 flex flex-col relative min-h-0">
        {/* Grid lines and Y-axis labels */}
        <div className="flex-1 flex flex-col justify-between absolute left-0 top-0 bottom-0 w-10 text-[10px] text-slate-500">
          {[1, 0.75, 0.5, 0.25, 0].map((tick, i) => {
            const value = Math.round(maxValue * tick)
            return (
              <div key={i} className="text-right pr-2">
                {value}
              </div>
            )
          })}
        </div>

        {/* Chart area with gridlines */}
        <div className="flex-1 flex items-end justify-around gap-6 px-4 pb-8 ml-12 relative">
          {/* Horizontal grid lines */}
          {[1, 0.75, 0.5, 0.25].map((tick, i) => (
            <div
              key={`grid-${i}`}
              className="absolute left-0 right-0 border-t border-blue-100"
              style={{ bottom: `${(tick * 100) / (1.2)}%` }}
            />
          ))}

          {data.map((item) => {
            const percentage = (item.value / maxValue) * 100
            const barHeight = (percentage / 100) * chartHeight
            return (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 relative z-10 cursor-pointer"
                onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, text: `${item.label}: ${item.value}` })}
                onMouseLeave={() => setHover(null)}
              >
                <div className="text-xs font-bold text-slate-900">{item.value}</div>
                <div
                  className="rounded-sm shadow-md transition-all duration-300 hover:shadow-lg"
                  style={{
                    backgroundColor: item.color,
                    width: '50px',
                    height: `${Math.max(barHeight, 15)}px`,
                    border: `2px solid ${item.color}`,
                  }}
                />
                <div className="text-[10px] font-semibold text-slate-700 text-center">{item.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend and axis labels */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 flex-shrink-0">
        <div>Users</div>
        <div>→ Roles</div>
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

/**
 * Calendar Chart Component for Registration Activity
 */
function RegistrationActivityChart({
  year,
  month,
  users,
  variant = 'compact',
}: {
  year: number
  month: number
  users: AdminUser[]
  variant?: 'compact' | 'expanded'
}) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  // Filter users registered in the specified month/year - using actual backend data
  const usersByDay = useMemo(() => {
    const daysMap: Record<number, number> = {}
    const daysData: Record<number, { day: number | null; count: number; isFuture?: boolean }> = {}
    const today = new Date()
    const isCurrentMonthYear = today.getFullYear() === year && today.getMonth() + 1 === month

    // Count registrations by day from actual user data
    users.forEach((user) => {
      if (user.joined_at) {
        const joinDate = new Date(user.joined_at)
        // Ensure we parse the date correctly
        if (!isNaN(joinDate.getTime()) && joinDate.getFullYear() === year && joinDate.getMonth() + 1 === month) {
          const day = joinDate.getDate()
          daysMap[day] = (daysMap[day] || 0) + 1
        }
      }
    })

    // Build calendar grid with proper week starting
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday = 0, Sunday = 6

    // Fill in empty days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysData[Object.keys(daysData).length] = { day: null, count: 0 }
    }

    // Fill in days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isFuture = isCurrentMonthYear && day > today.getDate()
      const count = isFuture ? 0 : (daysMap[day] || 0)
      daysData[Object.keys(daysData).length] = { day, count, isFuture }
    }

    return Object.values(daysData)
  }, [year, month, users])

  const maxCount = Math.max(...usersByDay.map((d) => d.count), 1)
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
        {/* Day headers */}
        <div className={`grid grid-cols-7 ${headerGapClass} ${headerTextClass} text-slate-600 font-semibold ${headerMarginClass}`}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
            <div key={`${d}-${idx}`} className="text-center">{d}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className={`grid grid-cols-7 ${headerGapClass}`}>
          {usersByDay.map((dayData, idx) => {
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
                onMouseMove={(e) => dayData.day !== null && !dayData.isFuture && dayData.count > 0 ? setHover({ x: e.clientX, y: e.clientY, text: `Registrations: ${dayData.count}` }) : null}
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

function UserTable({
  users,
  title,
  roleType,
  isCollapsed,
  onToggleCollapse,
  showRoleColumn = true,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onStatusClick,
  onViewUser,
}: {
  users: AdminUser[]
  title?: string
  roleType?: UserRole
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  showRoleColumn?: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onStatusClick: (user: AdminUser) => void
  onViewUser: (user: AdminUser) => void
}) {
  const [page, setPage] = useState(1)
  const pageSize = 8
  const totalPages = Math.ceil(users.length / pageSize)
  const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize)
  const allSelected = paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.has(u.id))

  const RoleIcon = roleType ? roleIcons[roleType] : null

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="bg-white border border-blue-200 shadow-sm overflow-hidden transition-all duration-300 rounded-lg">
      {/* Table header with collapse toggle */}
      {title && (
        <div
          className={`flex items-center justify-between px-5 py-4 border-b border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors bg-gradient-to-r from-white to-blue-50`}
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-3">
            {RoleIcon && (
              <div className={`p-2 ${roleColors[roleType!].split(' ')[0]}`}>
                <RoleIcon className="w-5 h-5" />
              </div>
            )}
            <span className="font-bold text-blue-900 text-base">{title}</span>
            <span className="text-sm text-white bg-blue-600 px-2 py-0.5 rounded">{users.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {isCollapsed ? 'Click to expand' : `Showing ${paginatedUsers.length} of ${users.length}`}
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
                        onSelectAll(paginatedUsers.map((u) => u.id))
                      }
                    }}
                    className="w-4 h-4 accent-blue-600"
                  />
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Email
                </th>
                {showRoleColumn && (
                  <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                    Role
                  </th>
                )}
                {(roleType === 'user' || showRoleColumn) ? (
                  <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                    Orders
                  </th>
                ) : null}
                {roleType === 'seller' && (
                  <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                    Products
                  </th>
                )}
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => onToggleSelect(user.id)}
                      className="w-4 h-4 accent-blue-600"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover border border-blue-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-base font-medium text-blue-700">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-900 text-base">{user.name}</div>
                        <div className="text-sm text-slate-600">ID: {user.id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-base text-slate-700">{user.email}</td>
                  {showRoleColumn && (
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium border rounded ${
                          roleColors[user.role]
                        }`}
                      >
                        {React.createElement(roleIcons[user.role], { className: 'w-3.5 h-3.5' })}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                  )}
                  {(roleType === 'user' || showRoleColumn) && (
                    <td className="px-4 py-4 text-base text-slate-700">{user.orders_count}</td>
                  )}
                  {roleType === 'seller' && (
                    <td className="px-4 py-4 text-base text-slate-700">{user.products_count}</td>
                  )}
                  <td className="px-4 py-4">
                    <button
                      onClick={() => onStatusClick(user)}
                      className={`inline-block px-3 py-1.5 text-sm font-medium cursor-pointer transition-all hover:opacity-80 rounded ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-base text-slate-600">{formatDate(user.joined_at)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => onViewUser(user)}
                        className="p-2 hover:bg-blue-100 text-slate-500 hover:text-blue-700 border border-transparent hover:border-blue-300 transition-all rounded"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
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
          <div className="flex items-center justify-between px-5 py-4 border-t border-black/15 bg-slate-50">
            <div className="text-sm text-slate-500">
              {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, users.length)} of {users.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-black/15 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={i}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm border border-black/15 ${
                      page === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-black/15 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Data state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminUsersStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [statusModal, setStatusModal] = useState<{ user: AdminUser; open: boolean }>({ user: null as any, open: false })
  const [statusReason, setStatusReason] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  
  const [detailModal, setDetailModal] = useState<{ user: AdminUserDetail | null; open: boolean }>({ user: null, open: false })
  const [detailLoading, setDetailLoading] = useState(false)

  // Collapsed state for each role section
  const [collapsedSections, setCollapsedSections] = useState<Record<UserRole, boolean>>({
    admin: false,
    seller: false,
    user: false,
  })

  // Graph states
  const [graphType, setGraphType] = useState<'roles' | 'registrations'>('roles')
  const [graphYear, setGraphYear] = useState(new Date().getFullYear())
  const [graphMonth, setGraphMonth] = useState(new Date().getMonth() + 1)
  const [showGraphModal, setShowGraphModal] = useState(false)
  const currentYear = new Date().getFullYear()

  const toggleSection = (role: UserRole) => {
    setCollapsedSections((prev) => ({ ...prev, [role]: !prev[role] }))
  }

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, statsRes] = await Promise.all([
        getAdminUsers(1, 100, 'all', 'all', ''),
        getAdminUsersStats(),
      ])
      setUsers(usersRes.users || [])
      setStats(statsRes.stats || null)
    } catch (e) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, searchQuery, statusFilter])

  // Group users by role
  const usersByRole = useMemo(() => {
    return {
      admin: filteredUsers.filter((u) => u.role === 'admin'),
      seller: filteredUsers.filter((u) => u.role === 'seller'),
      user: filteredUsers.filter((u) => u.role === 'user'),
    }
  }, [filteredUsers])

  // Determine table order based on filter
  const tableOrder = useMemo((): UserRole[] => {
    if (roleFilter === 'all') return ['admin', 'seller', 'user']
    const others = (['admin', 'seller', 'user'] as UserRole[]).filter((r) => r !== roleFilter)
    return [roleFilter, ...others]
  }, [roleFilter])

  const isSplitView = roleFilter !== 'all'

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (ids: string[]) => {
    if (ids.length === 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const handleStatusClick = (user: AdminUser) => {
    setStatusModal({ user, open: true })
    setStatusReason('')
  }

  const handleStatusConfirm = async () => {
    if (!statusModal.user) return
    setStatusLoading(true)
    try {
      await toggleUserStatus(statusModal.user.id, statusReason)
      // Refresh data
      await fetchData()
      setStatusModal({ user: null as any, open: false })
    } catch (e) {
      alert('Failed to update status')
    } finally {
      setStatusLoading(false)
    }
  }

  const handleViewUser = async (user: AdminUser) => {
    setDetailLoading(true)
    setDetailModal({ user: null, open: true })
    try {
      const res = await getAdminUserDetail(user.id)
      setDetailModal({ user: res.user, open: true })
    } catch (e) {
      setDetailModal({ user: null, open: false })
      alert('Failed to load user details')
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

  return (
    <div className="space-y-6 w-full min-h-screen px-[3%]">
      {/* Page Hero */}
      <PageTitleHero
        title="User Management"
        subtitle="View and manage all registered users, sellers, and administrators."
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* KPI + Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPIs on the left - 2x2 grid */}
        <div className="grid grid-cols-2 gap-4 lg:items-start">
          {/* Total Users - Top Left */}
          <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-blue-700">Total Users</div>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats?.total ?? '-'}</div>
            <div className="text-xs text-blue-600 mt-2">All users</div>
          </div>

          {/* Admins - Top Right */}
          <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-purple-700">Admins</div>
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats?.admins ?? '-'}</div>
            <div className="text-xs text-purple-600 mt-2">{((stats?.admins || 0) / (stats?.total || 1) * 100).toFixed(1)}%</div>
          </div>

          {/* Sellers - Bottom Left */}
          <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-blue-700">Sellers</div>
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats?.sellers ?? '-'}</div>
            <div className="text-xs text-blue-600 mt-2">{((stats?.sellers || 0) / (stats?.total || 1) * 100).toFixed(1)}%</div>
          </div>

          {/* Regular Users - Bottom Right */}
          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-slate-700">Users</div>
              <User className="w-6 h-6 text-slate-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats?.users ?? '-'}</div>
            <div className="text-xs text-slate-600 mt-2">{((stats?.users || 0) / (stats?.total || 1) * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Graph on the right */}
        <div className="lg:col-span-2 bg-white border border-blue-200 shadow-md p-3 rounded-lg max-h-[300px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-blue-900">User Analytics</h3>
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
              onClick={() => setGraphType('roles')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'roles'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <BarChart3 className="w-3 h-3 inline mr-0.5" />
              User Roles
            </button>
            <button
              onClick={() => setGraphType('registrations')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'registrations'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <Calendar className="w-3 h-3 inline mr-0.5" />
              Registration Activity
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
            {graphType === 'registrations' && (
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
            {graphType === 'roles' ? (
              <RoleDistributionChart stats={stats} />
            ) : (
              <RegistrationActivityChart year={graphYear} month={graphMonth} users={users} />
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
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-blue-300 bg-white text-base focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as FilterRole)}
            className="px-3 py-2.5 border border-blue-300 bg-white text-base min-w-[140px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="seller">Seller</option>
            <option value="user">User</option>
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-3 py-2.5 border border-blue-300 bg-white text-base min-w-[130px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Export */}
        <button className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 bg-white text-base hover:bg-blue-50 transition-colors ml-auto rounded font-semibold text-blue-700">
          <Download className="w-4 h-4" />
          Export
        </button>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-2 border border-blue-300 rounded">
            {selectedIds.size} selected
          </div>
        )}
      </div>

      {/* Tables Container */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading users...</div>
      ) : error ? (
        <div className="text-center py-16 text-red-600">{error}</div>
      ) : (
        <div
          className={`transition-all duration-500 ease-in-out ${
            isSplitView ? 'space-y-5' : 'space-y-0'
          }`}
        >
          {isSplitView ? (
            /* Split View - 3 Collapsible Tables */
            tableOrder.map((role, index) => (
              <div
                key={role}
                className="transition-all duration-500 ease-in-out transform"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'slideIn 0.4s ease-out forwards',
                }}
              >
                <UserTable
                  users={usersByRole[role]}
                  title={roleLabels[role]}
                  roleType={role}
                  isCollapsed={collapsedSections[role]}
                  onToggleCollapse={() => toggleSection(role)}
                  showRoleColumn={false}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onStatusClick={handleStatusClick}
                  onViewUser={handleViewUser}
                />
              </div>
            ))
          ) : (
            /* Single Table View - All Users */
            <div className="transition-all duration-500 ease-in-out">
              <UserTable
                users={filteredUsers}
                showRoleColumn={true}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onStatusClick={handleStatusClick}
                onViewUser={handleViewUser}
              />
            </div>
          )}
        </div>
      )}

      {/* Graph Expansion Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowGraphModal(false)}>
          <div
            className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-blue-200 shadow-xl rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-blue-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-blue-900">User Analytics - Expanded View</h2>
              <button
                onClick={() => setShowGraphModal(false)}
                className="p-2 hover:bg-blue-50 transition-colors rounded"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Graph Type Toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setGraphType('roles')}
                  className={`px-4 py-2 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'roles'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-1" />
                  User Roles
                </button>
                <button
                  onClick={() => setGraphType('registrations')}
                  className={`px-4 py-2 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'registrations'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Registration Activity
                </button>
              </div>

              {/* Expanded Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={graphYear}
                  onChange={(e) => setGraphYear(Number(e.target.value))}
                  className="px-4 py-2 border border-blue-300 bg-white text-sm rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {graphType === 'registrations' && (
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

              {/* Expanded Graph Display */}
              <div className="p-8 bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-lg">
                {graphType === 'roles' ? (
                  <RoleDistributionChart stats={stats} />
                ) : (
                  <RegistrationActivityChart year={graphYear} month={graphMonth} users={users} variant="expanded" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Toggle Modal */}
      {statusModal.open && statusModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md border border-black/15 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/15">
              <h2 className="text-lg font-semibold text-slate-900">
                {statusModal.user.status === 'active' ? 'Deactivate' : 'Activate'} User
              </h2>
              <button onClick={() => setStatusModal({ user: null as any, open: false })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-black/10">
                {statusModal.user.avatar ? (
                  <img src={statusModal.user.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-lg font-medium">
                    {statusModal.user.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-medium text-slate-900">{statusModal.user.name}</div>
                  <div className="text-sm text-slate-500">{statusModal.user.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  {statusModal.user.status === 'active'
                    ? 'This user will be deactivated and notified via email. They will not be able to log in until reactivated.'
                    : 'This user will be reactivated and notified via email. They will regain access to their account.'}
                </div>
              </div>

              {statusModal.user.status === 'active' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Reason for deactivation</label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-black/15 text-base focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    placeholder="Enter reason (will be sent to user via email)..."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-black/15 bg-slate-50">
              <button
                onClick={() => setStatusModal({ user: null as any, open: false })}
                className="px-4 py-2 border border-black/15 text-base hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusConfirm}
                disabled={statusLoading}
                className={`px-4 py-2 text-white text-base font-medium disabled:opacity-50 ${
                  statusModal.user.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {statusLoading ? 'Processing...' : statusModal.user.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {detailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailModal({ user: null, open: false })}>
          <div className="bg-white w-full max-w-lg border border-black/15 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/15">
              <h2 className="text-lg font-semibold text-slate-900">User Details</h2>
              <button onClick={() => setDetailModal({ user: null, open: false })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {detailLoading ? (
              <div className="p-10 text-center text-slate-500">Loading...</div>
            ) : detailModal.user ? (
              <div className="p-5 space-y-5">
                {/* Profile header */}
                <div className="flex items-center gap-4">
                  {detailModal.user.avatar ? (
                    <img src={detailModal.user.avatar} alt="" className="w-16 h-16 rounded-full object-cover border border-black/10" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-medium text-slate-600">
                      {detailModal.user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-xl font-bold text-slate-900">{detailModal.user.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-sm font-medium border ${roleColors[detailModal.user.role]}`}>
                        {React.createElement(roleIcons[detailModal.user.role], { className: 'w-3.5 h-3.5' })}
                        {detailModal.user.role.charAt(0).toUpperCase() + detailModal.user.role.slice(1)}
                      </span>
                      <span className={`px-2 py-0.5 text-sm font-medium ${detailModal.user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {detailModal.user.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-black/10">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Email</div>
                      <div className="text-sm font-medium text-slate-900">{detailModal.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-black/10">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Joined</div>
                      <div className="text-sm font-medium text-slate-900">{formatDate(detailModal.user.joined_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-black/10">
                    <ScanLine className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Scans</div>
                      <div className="text-sm font-medium text-slate-900">{detailModal.user.scans_count}</div>
                    </div>
                  </div>
                  {detailModal.user.role === 'user' && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-black/10">
                      <ShoppingCart className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-xs text-slate-500">Orders</div>
                        <div className="text-sm font-medium text-slate-900">{detailModal.user.orders_count}</div>
                      </div>
                    </div>
                  )}
                  {detailModal.user.role === 'seller' && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-black/10">
                      <Package className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-xs text-slate-500">Products</div>
                        <div className="text-sm font-medium text-slate-900">{detailModal.user.products_count}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Deactivation info */}
                {detailModal.user.status === 'inactive' && detailModal.user.deactivation_reason && (
                  <div className="p-3 bg-red-50 border border-red-200">
                    <div className="text-xs text-red-600 font-medium mb-1">Deactivation Reason</div>
                    <div className="text-sm text-red-800">{detailModal.user.deactivation_reason}</div>
                    {detailModal.user.deactivated_at && (
                      <div className="text-xs text-red-500 mt-1">Deactivated on {formatDate(detailModal.user.deactivated_at)}</div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            <div className="flex justify-end p-5 border-t border-black/15 bg-slate-50">
              <button
                onClick={() => setDetailModal({ user: null, open: false })}
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
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
