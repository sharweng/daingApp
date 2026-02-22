/**
 * History page: Netflix-style horizontal carousels grouped by date.
 * Filters for fish type and date range (specific date, month, or year).
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageTitleHero from '../components/layout/PageTitleHero'
import { getDetailedHistory, type DetailedHistoryEntry } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { History, X, Loader2, ImageOff, ChevronLeft, ChevronRight, Filter, Calendar, Fish, Search } from 'lucide-react'

type DateFilterMode = 'all' | 'date' | 'month' | 'year'

/** Group entries by date (YYYY-MM-DD). */
function groupByDate(entries: DetailedHistoryEntry[]): { date: string; label: string; items: DetailedHistoryEntry[] }[] {
  const map = new Map<string, DetailedHistoryEntry[]>()
  for (const e of entries) {
    const date = e.timestamp.slice(0, 10)
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(e)
  }
  const sorted = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  return sorted.map(([date, items]) => ({
    date,
    label: formatDateLabel(date),
    items,
  }))
}

function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Horizontal scrolling carousel row for a single date group */
function DateCarousel({ 
  label, 
  items, 
  onItemClick 
}: { 
  label: string
  items: DetailedHistoryEntry[]
  onItemClick: (entry: DetailedHistoryEntry) => void 
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
      return () => {
        el.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [items])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = scrollRef.current.clientWidth * 0.8
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  return (
    <section className="relative group">
      <h2 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b border-blue-300">{label}</h2>
      
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 translate-y-2 z-10 w-10 h-10 bg-blue-600/70 hover:bg-blue-700 text-white flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 translate-y-2 z-10 w-10 h-10 bg-blue-600/70 hover:bg-blue-700 text-white flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onItemClick(entry)}
            className="group/card flex-shrink-0 w-48 md:w-56 lg:w-64 relative overflow-hidden border border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded-lg"
          >
            <div className="aspect-square overflow-hidden bg-blue-100">
              <img
                src={entry.url}
                alt={`${entry.fish_type} - ${entry.grade}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Overlay with info */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover/card:translate-y-0 transition-transform">
              <div className="text-white text-sm font-semibold truncate">{entry.fish_type || 'Unknown'}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-400/60 text-white text-xs font-medium rounded">{entry.grade || 'N/A'}</span>
                <span className="text-white/80 text-xs">{formatTime(entry.timestamp)}</span>
              </div>
            </div>
            {/* Static label at bottom */}
            <div className="p-2 bg-gradient-to-r from-white to-blue-50 border-t border-blue-200">
              <p className="text-xs text-blue-900 truncate font-semibold">{entry.fish_type || 'Unknown'}</p>
              <p className="text-xs text-blue-700">{entry.grade || 'N/A'} • {formatTime(entry.timestamp)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export default function HistoryPage() {
  const { isLoggedIn } = useAuth()
  const [entries, setEntries] = useState<DetailedHistoryEntry[]>([])
  const [fishTypes, setFishTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalEntry, setModalEntry] = useState<DetailedHistoryEntry | null>(null)

  // Filters
  const [selectedFishType, setSelectedFishType] = useState<string>('All')
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')

  useEffect(() => {
    const controller = new AbortController()
    getDetailedHistory(controller.signal)
      .then((data) => {
        setEntries(data.entries)
        setFishTypes(data.fish_types || [])
        setError(null)
      })
      .catch((err) => {
        if ((err as { code?: string }).code === 'ERR_CANCELED') return
        setError('Could not load history. Is the backend running?')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  // Get unique years from entries
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    entries.forEach(e => years.add(e.timestamp.slice(0, 4)))
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }, [entries])

  // Get unique months from entries
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    entries.forEach(e => months.add(e.timestamp.slice(0, 7)))
    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }, [entries])

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = entries

    // Filter by fish type
    if (selectedFishType !== 'All') {
      result = result.filter(e => e.fish_type === selectedFishType)
    }

    // Filter by date
    if (dateFilterMode === 'date' && selectedDate) {
      result = result.filter(e => e.timestamp.slice(0, 10) === selectedDate)
    } else if (dateFilterMode === 'month' && selectedMonth) {
      result = result.filter(e => e.timestamp.slice(0, 7) === selectedMonth)
    } else if (dateFilterMode === 'year' && selectedYear) {
      result = result.filter(e => e.timestamp.slice(0, 4) === selectedYear)
    }

    return result
  }, [entries, selectedFishType, dateFilterMode, selectedDate, selectedMonth, selectedYear])

  const groups = groupByDate(filteredEntries)

  const clearFilters = () => {
    setSelectedFishType('All')
    setDateFilterMode('all')
    setSelectedDate('')
    setSelectedMonth('')
    setSelectedYear('')
  }

  const hasActiveFilters = selectedFishType !== 'All' || dateFilterMode !== 'all'

  if (!isLoggedIn) {
    return (
      <div className="space-y-8">
        <PageTitleHero
          title="Scan History"
          subtitle="Your saved analysis images from the cloud, organized by date."
          backgroundImage="/assets/page-hero/history.jpg"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg p-8 text-center shadow-lg">
            <History className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Login to view your scan history</h2>
            <p className="text-slate-600 mb-6">Sign in to access your saved fish analysis images and grading history.</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Login to Continue
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageTitleHero
        title="Scan History"
        subtitle="Your saved analysis images from the cloud, organized by date."
        backgroundImage="/assets/page-hero/history.jpg"
      />

      {/* Filters Section */}
      <div className="bg-gradient-to-r from-white to-blue-50 border border-blue-200 p-4 shadow-lg rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-900">Filters</span>
          </div>

          {/* Fish Type Filter */}
          <div className="flex items-center gap-2">
            <Fish className="w-4 h-4 text-slate-500" />
            <select
              value={selectedFishType}
              onChange={(e) => setSelectedFishType(e.target.value)}
              className="px-3 py-1.5 border border-blue-300 text-sm bg-white rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            >
              <option value="All">All Fish Types</option>
              {fishTypes.map(ft => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
            </select>
          </div>

          {/* Date Filter Mode */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value as DateFilterMode)}
              className="px-3 py-1.5 border border-blue-300 text-sm bg-white rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            >
              <option value="all">All Dates</option>
              <option value="date">Specific Date</option>
              <option value="month">By Month</option>
              <option value="year">By Year</option>
            </select>
          </div>

          {/* Date Picker based on mode */}
          {dateFilterMode === 'date' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-blue-300 text-sm bg-white rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          )}
          {dateFilterMode === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-blue-300 text-sm bg-white rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            >
              <option value="">Select Month</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</option>
              ))}
            </select>
          )}
          {dateFilterMode === 'year' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 border border-blue-300 text-sm bg-white rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            >
              <option value="">Select Year</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}

          <div className="ml-auto text-sm text-slate-500">
            {filteredEntries.length} scan{filteredEntries.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="card max-w-xl">
          <div className="text-red-600 flex items-center gap-2">
            <ImageOff className="w-5 h-5" />
            {error}
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="card max-w-xl text-center py-12">
          <History className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            {entries.length === 0 ? 'No scans yet' : 'No matching scans'}
          </h2>
          <p className="text-slate-600 mb-4">
            {entries.length === 0 
              ? 'Analyze a dried fish image on the Grade page to see your history here.'
              : 'Try adjusting your filters to see more results.'}
          </p>
          {entries.length === 0 ? (
            <Link
              to="/grade"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Go to Grade
            </Link>
          ) : (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ date, label, items }) => (
            <DateCarousel
              key={date}
              label={label}
              items={items}
              onItemClick={setModalEntry}
            />
          ))}
        </div>
      )}

      {/* Full-size image modal */}
      {modalEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalEntry(null)}
          role="dialog"
          aria-modal="true"
          aria-label="View image"
        >
          <button
            type="button"
            onClick={() => setModalEntry(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalEntry.url}
              alt={`${modalEntry.fish_type} - ${modalEntry.grade}`}
              className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-lg shadow-2xl mx-auto"
              referrerPolicy="no-referrer"
            />
            <div className="text-center mt-4">
              <p className="text-white text-lg font-semibold">{modalEntry.fish_type || 'Unknown Fish'}</p>
              <p className="text-white/80 text-sm mt-1">
                Grade: <span className="font-medium">{modalEntry.grade || 'N/A'}</span>
                {modalEntry.score != null && <> • Score: {modalEntry.score.toFixed(2)}</>}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {formatDateLabel(modalEntry.timestamp)} at {formatTime(modalEntry.timestamp)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
