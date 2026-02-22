/**
 * Admin Community Posts Management Page
 * Features: posts table with image carousel, status filtering, disable modal, comment viewer
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
  BarChart3,
  MessageCircle,
  Heart,
  Image as ImageIcon,
  AlertCircle,
  Ban,
  CheckCircle,
  Trash2,
  User,
  Users,
  FileText,
  Copy,
  Check,
} from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import {
  getAdminPosts,
  getAdminPostsStats,
  togglePostStatus,
  getAdminPostComments,
  toggleCommentStatus,
  type AdminPost,
  type AdminPostsStats,
  type AdminComment,
  type AdminPostDetail,
} from '../services/api'

type PostStatus = 'active' | 'deleted' | 'disabled'
type FilterStatus = 'all' | PostStatus

const statusColors: Record<PostStatus, string> = {
  active: 'bg-green-100 text-green-800',
  deleted: 'bg-red-100 text-red-800',
  disabled: 'bg-orange-100 text-orange-800',
}

const statusIcons: Record<PostStatus, React.ElementType> = {
  active: CheckCircle,
  deleted: Trash2,
  disabled: Ban,
}

// Image Carousel Component - supports normal (table) and large (modal) sizes
function ImageCarousel({ images, size = 'normal' }: { images: string[]; size?: 'normal' | 'large' }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const sizeClasses = size === 'large' ? 'w-full max-w-md h-64' : 'w-20 h-20'
  const iconSize = size === 'large' ? 'w-12 h-12' : 'w-6 h-6'
  const arrowPadding = size === 'large' ? 'p-2' : 'p-0.5'
  const arrowIconSize = size === 'large' ? 'w-5 h-5' : 'w-3 h-3'

  if (!images || images.length === 0) {
    return (
      <div className={`${sizeClasses} bg-slate-100 flex items-center justify-center border border-black/10`}>
        <ImageIcon className={`${iconSize} text-slate-400`} />
      </div>
    )
  }

  return (
    <div className={`relative ${sizeClasses} group`}>
      <img
        src={images[currentIndex]}
        alt={`Image ${currentIndex + 1}`}
        className={`${sizeClasses} object-cover border border-black/10`}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
            }}
            className={`absolute left-1 top-1/2 -translate-y-1/2 bg-black/60 text-white ${arrowPadding} rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80`}
          >
            <ChevronLeft className={arrowIconSize} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setCurrentIndex((prev) => (prev + 1) % images.length)
            }}
            className={`absolute right-1 top-1/2 -translate-y-1/2 bg-black/60 text-white ${arrowPadding} rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80`}
          >
            <ChevronRight className={arrowIconSize} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(i)
                }}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
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

function PostCreationCalendarChart({
  year,
  month,
  posts,
  variant = 'compact',
}: {
  year: number
  month: number
  posts: AdminPost[]
  variant?: 'compact' | 'expanded'
}) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const postsByDay = useMemo(() => {
    const daysMap: Record<number, number> = {}
    const daysData: Record<number, { day: number | null; count: number; isFuture?: boolean }> = {}
    const today = new Date()
    const isCurrentMonthYear = today.getFullYear() === year && today.getMonth() + 1 === month

    posts.forEach((post) => {
      if (post.created_at) {
        const createdDate = new Date(post.created_at)
        if (!isNaN(createdDate.getTime()) && createdDate.getFullYear() === year && createdDate.getMonth() + 1 === month) {
          const day = createdDate.getDate()
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
  }, [year, month, posts])

  const maxCount = Math.max(...postsByDay.map((d) => d.count), 1)
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
          {postsByDay.map((dayData, idx) => {
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
                onMouseMove={(e) => dayData.day !== null && !dayData.isFuture && dayData.count > 0 ? setHover({ x: e.clientX, y: e.clientY, text: `Posts: ${dayData.count}` }) : null}
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

function PostCategoryDistributionChart({ posts, year }: { posts: AdminPost[]; year: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    posts.forEach((post) => {
      if (!post.created_at) return
      const createdDate = new Date(post.created_at)
      if (isNaN(createdDate.getTime()) || createdDate.getFullYear() !== year) return
      const category = post.category || 'Uncategorized'
      counts[category] = (counts[category] || 0) + 1
    })

    return Object.entries(counts).map(([label, value], index) => ({
      label,
      value,
      color: ['#2563EB', '#60A5FA', '#8B5CF6', '#0EA5E9', '#1D4ED8'][index % 5],
    }))
  }, [posts, year])

  if (data.length === 0) {
    return <div className="h-40 flex items-center justify-center text-slate-500">No data</div>
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const chartHeight = 150

  return (
    <div className="space-y-2 h-full flex flex-col relative">
      <div className="flex-1 flex flex-col relative min-h-0">
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

        <div className="flex-1 flex items-end justify-around gap-4 px-3 pb-6 ml-10 relative">
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
                <div className="text-[10px] font-semibold text-slate-700 text-center max-w-[70px]">
                  {item.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 flex-shrink-0">
        <div>Posts</div>
        <div>&rarr; Categories</div>
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

export default function AdminPostsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Data state
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [stats, setStats] = useState<AdminPostsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyticsPosts, setAnalyticsPosts] = useState<AdminPost[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Disable modal state
  const [disableModal, setDisableModal] = useState<{ post: AdminPost | null; open: boolean }>({ post: null, open: false })
  const [disableReason, setDisableReason] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)

  // Post detail modal with comments
  const [detailModal, setDetailModal] = useState<{ open: boolean }>({ open: false })
  const [selectedPost, setSelectedPost] = useState<AdminPostDetail | null>(null)
  const [selectedComments, setSelectedComments] = useState<AdminComment[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Comment disable modal
  const [commentDisableModal, setCommentDisableModal] = useState<{ comment: AdminComment | null; open: boolean }>({ comment: null, open: false })
  const [commentDisableReason, setCommentDisableReason] = useState('')
  const [commentDisableLoading, setCommentDisableLoading] = useState(false)

  // Graph state
  const today = new Date()
  const [graphType, setGraphType] = useState<'calendar' | 'category'>('calendar')
  const [graphYear, setGraphYear] = useState(today.getFullYear())
  const [graphMonth, setGraphMonth] = useState(today.getMonth() + 1)
  const [showGraphModal, setShowGraphModal] = useState(false)

  // Fetch posts
  useEffect(() => {
    fetchPosts()
  }, [page, statusFilter, categoryFilter])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchAnalyticsPosts()
  }, [])

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminPosts(page, pageSize, statusFilter, searchQuery, categoryFilter)
      setPosts(res.posts || [])
      setTotalPosts(res.total || 0)
    } catch (e) {
      setError('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await getAdminPostsStats()
      setStats(res.stats || null)
    } catch (e) {
      console.error('Failed to load stats')
    }
  }

  const fetchAnalyticsPosts = async () => {
    setAnalyticsLoading(true)
    try {
      const pageSize = 200
      let pageIndex = 1
      let allPosts: AdminPost[] = []
      let total = 0

      while (true) {
        const res = await getAdminPosts(pageIndex, pageSize, 'all', '', 'all')
        allPosts = allPosts.concat(res.posts || [])
        total = res.total || 0
        if (allPosts.length >= total || (res.posts || []).length === 0) break
        pageIndex += 1
      }

      setAnalyticsPosts(allPosts)
    } catch (e) {
      console.error('Failed to load analytics posts')
      setAnalyticsPosts([])
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchPosts()
      } else {
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const totalPages = Math.ceil(totalPosts / pageSize)

  const totalLikes = useMemo(() => {
    return analyticsPosts.reduce((sum, post) => sum + (post.likes || 0), 0)
  }, [analyticsPosts])

  const activeUsers = useMemo(() => {
    return new Set(analyticsPosts.map((post) => post.author_id).filter(Boolean)).size
  }, [analyticsPosts])

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
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)))
    }
  }

  const handleDisableClick = (post: AdminPost) => {
    setDisableModal({ post, open: true })
    setDisableReason('')
  }

  const handleBulkDisable = () => {
    if (selectedIds.size === 0) return
    const firstPost = posts.find((p) => selectedIds.has(p.id))
    if (firstPost) {
      setDisableModal({ post: firstPost, open: true })
      setDisableReason('')
    }
  }

  const handleDisableConfirm = async () => {
    if (!disableModal.post) return
    setDisableLoading(true)
    try {
      if (selectedIds.size > 1) {
        const promises = Array.from(selectedIds).map((id) => togglePostStatus(id, disableReason))
        await Promise.all(promises)
        setSelectedIds(new Set())
      } else {
        await togglePostStatus(disableModal.post.id, disableReason)
      }
      await fetchPosts()
      await fetchStats()
      await fetchAnalyticsPosts()
      setDisableModal({ post: null, open: false })
    } catch (e) {
      alert('Failed to update post status')
    } finally {
      setDisableLoading(false)
    }
  }

  const handleViewPost = async (post: AdminPost) => {
    setDetailLoading(true)
    setDetailModal({ open: true })
    setSelectedPost(null)
    setSelectedComments([])
    try {
      const res = await getAdminPostComments(post.id)
      setSelectedPost(res.post)
      setSelectedComments(res.comments || [])
    } catch (e) {
      console.error('Failed to load post details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCommentDisableClick = (comment: AdminComment) => {
    setCommentDisableModal({ comment, open: true })
    setCommentDisableReason('')
  }

  const handleCommentDisableConfirm = async () => {
    if (!commentDisableModal.comment) return
    setCommentDisableLoading(true)
    try {
      await toggleCommentStatus(commentDisableModal.comment.id, commentDisableReason)
      // Refresh comments in modal
      if (selectedPost) {
        const res = await getAdminPostComments(selectedPost.id)
        setSelectedComments(res.comments || [])
      }
      await fetchStats()
      setCommentDisableModal({ comment: null, open: false })
    } catch (e) {
      alert('Failed to update comment status')
    } finally {
      setCommentDisableLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '-'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Page Hero */}
      <PageTitleHero
        title="Community Posts Management"
        subtitle="View and manage all community forum posts and comments."
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      {/* KPI + Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPIs on the left - 2x2 grid */}
        <div className="grid grid-cols-2 gap-4 lg:items-start">
          <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-blue-700">Total Posts</div>
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats?.total_posts ?? '-'}</div>
            <div className="text-xs text-blue-600 mt-2">All posts</div>
          </div>
          <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-green-700">Total Comments</div>
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-700">{stats?.total_comments ?? '-'}</div>
            <div className="text-xs text-green-600 mt-2">All comments</div>
          </div>
          <div className="bg-gradient-to-br from-white to-rose-50 border border-rose-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-rose-700">Total Likes</div>
              <Heart className="w-6 h-6 text-rose-600" />
            </div>
            <div className="text-3xl font-bold text-rose-600">{analyticsLoading ? '-' : totalLikes}</div>
            <div className="text-xs text-rose-600 mt-2">All likes</div>
          </div>
          <div className="bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 shadow-md p-5 rounded-lg hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-indigo-700">Active Users</div>
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold text-indigo-700">{analyticsLoading ? '-' : activeUsers}</div>
            <div className="text-xs text-indigo-600 mt-2">Posted at least once</div>
          </div>
        </div>

        {/* Graph on the right */}
        <div className="lg:col-span-2 bg-white border border-blue-200 shadow-md p-3 rounded-lg max-h-[300px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-blue-900">Community Post Analytics</h3>
            <button
              onClick={() => setShowGraphModal(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 transition-colors border border-blue-300 rounded"
              title="Expand view"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Graph Type Toggle + Filter Controls on same row */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <button
              onClick={() => setGraphType('calendar')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'calendar'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <Calendar className="w-3 h-3 inline mr-0.5" />
              Post Calendar
            </button>
            <button
              onClick={() => setGraphType('category')}
              className={`px-2 py-1 text-xs font-semibold border rounded transition-colors ${
                graphType === 'category'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <BarChart3 className="w-3 h-3 inline mr-0.5" />
              Category Distribution
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
            {graphType === 'calendar' ? (
              <PostCreationCalendarChart year={graphYear} month={graphMonth} posts={analyticsPosts} />
            ) : (
              <PostCategoryDistributionChart posts={analyticsPosts} year={graphYear} />
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
            placeholder="Search by title, description, author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-blue-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as FilterStatus)
              setPage(1)
            }}
            className="px-3 py-2.5 border border-blue-300 bg-white text-base text-slate-900 min-w-[130px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="deleted">Deleted</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2.5 border border-blue-300 bg-white text-base text-slate-900 min-w-[140px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded"
        >
          <option value="all">All Categories</option>
          <option value="Discussion">Discussion</option>
          <option value="Question">Question</option>
          <option value="Tips">Tips</option>
          <option value="Showcase">Showcase</option>
        </select>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-2 border border-blue-300 rounded">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBulkDisable}
              className="flex items-center gap-1 px-3 py-2 bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors rounded"
            >
              <Ban className="w-4 h-4" />
              Disable Selected
            </button>
          </div>
        )}

        {/* Export */}
        <button className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 bg-white text-base text-blue-700 hover:bg-blue-50 ml-auto font-semibold transition-colors rounded">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Posts Table */}
      <div className="bg-white border border-blue-200 shadow-sm overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-200">
              <tr>
                <th className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={posts.length > 0 && selectedIds.size === posts.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-blue-600"
                  />
                </th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Images</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Author</th>
                <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  <Heart className="w-4 h-4 inline" />
                </th>
                <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">
                  <MessageCircle className="w-4 h-4 inline" />
                </th>
                <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-600">Loading posts...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-red-600">{error}</td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-600">No posts found</td>
                </tr>
              ) : (
                posts.map((post) => {
                  const StatusIcon = statusIcons[post.status]
                  return (
                    <tr key={post.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(post.id)}
                          onChange={() => handleToggleSelect(post.id)}
                          className="w-4 h-4 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-800 font-mono">{post.id.slice(0, 8)}</span>
                          <CopyButton text={post.id} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <ImageCarousel images={post.images} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900 text-sm max-w-[150px]">
                          {truncateText(post.title, 30)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-800 max-w-[200px]">
                          {truncateText(post.description, 50)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium">
                          {post.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-800">
                          {formatDate(post.created_at)}
                        </div>
                        {post.updated_at && post.updated_at !== post.created_at && (
                          <div className="text-xs text-slate-600">
                            Updated: {formatDate(post.updated_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${statusColors[post.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </span>
                        {post.disable_reason && (
                          <div className="text-xs text-orange-600 mt-1 max-w-[100px] truncate" title={post.disable_reason}>
                            {post.disable_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {post.author_avatar ? (
                            <img src={post.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-black/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">
                              {post.author_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="text-sm text-slate-800">{truncateText(post.author_name, 15)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-slate-800 font-medium">{post.likes}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-slate-800 font-medium">{post.comments_count}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewPost(post)}
                            className="p-2 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-all"
                            title="View Details & Comments"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {post.status !== 'deleted' && (
                            <button
                              onClick={() => handleDisableClick(post)}
                              className={`p-2 border border-transparent transition-all ${
                                post.status === 'disabled'
                                  ? 'hover:bg-green-50 text-green-600 hover:border-green-200'
                                  : 'hover:bg-orange-50 text-slate-600 hover:text-orange-600 hover:border-orange-200'
                              }`}
                              title={post.status === 'disabled' ? 'Enable Post' : 'Disable Post'}
                            >
                              {post.status === 'disabled' ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </button>
                          )}
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
              {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalPosts)} of {totalPosts}
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
                const pageNum = i + 1
                return (
                  <button
                    key={i}
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
              <h2 className="text-xl font-bold text-blue-900">Community Post Analytics - Expanded View</h2>
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
                  onClick={() => setGraphType('calendar')}
                  className={`px-4 py-2 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'calendar'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Post Calendar
                </button>
                <button
                  onClick={() => setGraphType('category')}
                  className={`px-4 py-2 text-sm font-semibold border rounded transition-colors ${
                    graphType === 'category'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-1" />
                  Category Distribution
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
                {graphType === 'calendar' ? (
                  <PostCreationCalendarChart year={graphYear} month={graphMonth} posts={analyticsPosts} variant="expanded" />
                ) : (
                  <PostCategoryDistributionChart posts={analyticsPosts} year={graphYear} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal with Comments */}
      {detailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailModal({ open: false })}>
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-black/15 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/15 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">Post Details</h2>
              <button onClick={() => setDetailModal({ open: false })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div className="py-20 text-center text-slate-600">Loading post details...</div>
              ) : selectedPost ? (
                <div className="space-y-6">
                  {/* Post Info */}
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image */}
                    <div className="shrink-0">
                      <ImageCarousel images={selectedPost.images || []} size="large" />
                    </div>

                    {/* Post Details */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${statusColors[selectedPost.status]}`}>
                          {React.createElement(statusIcons[selectedPost.status], { className: 'w-3 h-3' })}
                          {selectedPost.status.charAt(0).toUpperCase() + selectedPost.status.slice(1)}
                        </span>
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium">
                          {selectedPost.category}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">{selectedPost.title}</h3>
                      <p className="text-base text-slate-800 leading-relaxed">{selectedPost.description}</p>

                      <div className="flex items-center gap-4 text-sm text-slate-700 pt-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {selectedPost.author_avatar ? (
                            <img src={selectedPost.author_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                              {selectedPost.author_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{selectedPost.author_name}</span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> {formatDate(selectedPost.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" /> {selectedPost.likes} likes
                        </span>
                      </div>

                      {selectedPost.disable_reason && (
                        <div className="p-3 bg-orange-50 border border-orange-200 text-sm">
                          <span className="font-medium text-orange-800">Disable reason:</span>
                          <span className="text-orange-700 ml-1">{selectedPost.disable_reason}</span>
                        </div>
                      )}

                      {/* Post ID for reference */}
                      <div className="flex items-center gap-2 pt-2 text-xs text-slate-600">
                        <span>Post ID:</span>
                        <code className="bg-slate-100 px-2 py-0.5 font-mono">{selectedPost.id}</code>
                        <CopyButton text={selectedPost.id} />
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="border-t border-black/10 pt-5">
                    <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Comments ({selectedComments.length})
                    </h4>

                    {selectedComments.length === 0 ? (
                      <div className="text-sm text-slate-600 py-4">No comments on this post</div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {selectedComments.map((comment) => {
                          const CommentStatusIcon = statusIcons[comment.status]
                          return (
                            <div
                              key={comment.id}
                              className={`p-4 border ${
                                comment.status === 'active'
                                  ? 'border-black/10 bg-white'
                                  : comment.status === 'deleted'
                                  ? 'border-red-200 bg-red-50'
                                  : 'border-orange-200 bg-orange-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-medium text-slate-900 text-sm">{comment.author_name}</span>
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium ${statusColors[comment.status]}`}>
                                      <CommentStatusIcon className="w-2.5 h-2.5" />
                                      {comment.status}
                                    </span>
                                    <span className="text-xs text-slate-600">{formatDate(comment.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-slate-800">{comment.text}</p>
                                  {comment.disable_reason && (
                                    <div className="mt-1 text-xs text-orange-700">
                                      Disable reason: {comment.disable_reason}
                                    </div>
                                  )}
                                </div>
                                {comment.status !== 'deleted' && (
                                  <button
                                    onClick={() => handleCommentDisableClick(comment)}
                                    className={`p-1.5 border transition-all ${
                                      comment.status === 'disabled'
                                        ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
                                        : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                                    }`}
                                    title={comment.status === 'disabled' ? 'Enable Comment' : 'Disable Comment'}
                                  >
                                    {comment.status === 'disabled' ? (
                                      <CheckCircle className="w-4 h-4" />
                                    ) : (
                                      <Ban className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-red-600">Failed to load post details</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-5 border-t border-black/15 bg-slate-50 shrink-0">
              <button
                onClick={() => setDetailModal({ open: false })}
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable Post Modal */}
      {disableModal.open && disableModal.post && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md border border-black/15 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/15">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedIds.size > 1
                  ? `Disable ${selectedIds.size} Posts`
                  : disableModal.post.status === 'disabled'
                  ? 'Enable Post'
                  : 'Disable Post'}
              </h2>
              <button onClick={() => setDisableModal({ post: null, open: false })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {selectedIds.size <= 1 && (
                <div className="p-3 bg-slate-50 border border-black/10">
                  <div className="font-medium text-slate-900">{disableModal.post.title}</div>
                  <div className="text-sm text-slate-600 mt-1">by {disableModal.post.author_name}</div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  {disableModal.post.status === 'disabled'
                    ? 'This post will be enabled and visible in the community forum again.'
                    : selectedIds.size > 1
                    ? `${selectedIds.size} posts will be disabled. They will no longer be visible in the community forum.`
                    : 'This post will be disabled. It will no longer be visible in the community forum. The author will be notified via email.'}
                </div>
              </div>

              {disableModal.post.status !== 'disabled' && (
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">Reason for disabling</label>
                  <textarea
                    value={disableReason}
                    onChange={(e) => setDisableReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-black/15 text-base text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    placeholder="e.g., Violates community guidelines, contains inappropriate content..."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-black/15 bg-slate-50">
              <button
                onClick={() => setDisableModal({ post: null, open: false })}
                className="px-4 py-2 border border-black/15 text-base text-slate-800 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableConfirm}
                disabled={disableLoading}
                className={`px-4 py-2 text-white text-base font-medium disabled:opacity-50 ${
                  disableModal.post.status === 'disabled'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {disableLoading ? 'Processing...' : disableModal.post.status === 'disabled' ? 'Enable' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable Comment Modal */}
      {commentDisableModal.open && commentDisableModal.comment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md border border-black/15 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/15">
              <h2 className="text-lg font-semibold text-slate-900">
                {commentDisableModal.comment.status === 'disabled' ? 'Enable' : 'Disable'} Comment
              </h2>
              <button onClick={() => setCommentDisableModal({ comment: null, open: false })} className="p-1 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-black/10">
                <div className="text-sm text-slate-800">{commentDisableModal.comment.text}</div>
                <div className="text-xs text-slate-600 mt-1">by {commentDisableModal.comment.author_name}</div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  {commentDisableModal.comment.status === 'disabled'
                    ? 'This comment will be enabled and visible again.'
                    : 'This comment will be disabled and hidden. The author will be notified via email.'}
                </div>
              </div>

              {commentDisableModal.comment.status !== 'disabled' && (
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">Reason for disabling</label>
                  <textarea
                    value={commentDisableReason}
                    onChange={(e) => setCommentDisableReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-black/15 text-base text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    placeholder="e.g., Contains foul language, harassment, spam..."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-black/15 bg-slate-50">
              <button
                onClick={() => setCommentDisableModal({ comment: null, open: false })}
                className="px-4 py-2 border border-black/15 text-base text-slate-800 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentDisableConfirm}
                disabled={commentDisableLoading}
                className={`px-4 py-2 text-white text-base font-medium disabled:opacity-50 ${
                  commentDisableModal.comment.status === 'disabled'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {commentDisableLoading ? 'Processing...' : commentDisableModal.comment.status === 'disabled' ? 'Enable' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
