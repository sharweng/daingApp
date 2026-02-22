import React, { useState, useEffect } from 'react'
import { Maximize2, X } from 'lucide-react'
import { getSellerSalesOverview, type SalesOverviewData } from '../services/api'

type DateFilter = 'year' | 'first-half' | 'second-half'

export default function SalesBarChart() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('year')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()])
  const [data, setData] = useState<SalesOverviewData[]>([])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedYear, dateFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const half = dateFilter === 'first-half' ? 1 : dateFilter === 'second-half' ? 2 : undefined
      const res = await getSellerSalesOverview(selectedYear, half)
      setData(res.data || [])
      if (res.available_years && res.available_years.length > 0) {
        setAvailableYears(res.available_years)
      }
    } catch (error) {
      console.error('Failed to load sales overview:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const renderChart = (chartHeight: number, padding: number, fontSize: { yAxis: number, xAxis: number, tooltip: number }) => {
    const maxAmount = Math.max(...data.map((d) => d.amount), 1)

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-slate-500">
          <p className="text-sm">No sales data for this period</p>
        </div>
      )
    }

    return (
      <svg
        viewBox={`0 0 ${80 * data.length + 2 * padding} ${chartHeight + 80}`}
        className="w-full"
        style={{ minHeight: `${chartHeight + 80}px` }}
      >
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
          const value = Math.round(maxAmount * percent)
          const y = chartHeight - chartHeight * percent + 30
          return (
            <g key={`y-${percent}`}>
              <line
                x1={padding - 5}
                y1={y}
                x2={80 * data.length + padding}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize={fontSize.yAxis}
                fill="#64748b"
                fontFamily="sans-serif"
              >
                ₱{value.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* X-axis */}
        <line
          x1={padding}
          y1={chartHeight + 30}
          x2={80 * data.length + padding}
          y2={chartHeight + 30}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {/* Bars */}
        {data.map((d, index) => {
          const barSpacing = 80
          const x = padding + index * barSpacing + barSpacing / 2
          const barHeight = maxAmount > 0 ? (d.amount / maxAmount) * chartHeight : 0
          const y = chartHeight + 30 - barHeight
          const isHovered = hoveredIndex === index
          const barWidth = 40

          return (
            <g
              key={`bar-${index}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Bar */}
              <rect
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                fill={isHovered ? '#2563eb' : '#3b82f6'}
                rx="2"
                className="transition-all"
              />

              {/* Label */}
              <text
                x={x}
                y={chartHeight + 50}
                textAnchor="middle"
                fontSize={fontSize.xAxis}
                fill={isHovered ? '#1e40af' : '#475569'}
                fontFamily="sans-serif"
                fontWeight={isHovered ? 'bold' : 'normal'}
              >
                {d.period}
              </text>

              {/* Tooltip */}
              {isHovered && (
                <>
                  <rect
                    x={x - 40}
                    y={y - 35}
                    width="80"
                    height="28"
                    fill="#1e40af"
                    rx="4"
                  />
                  <text
                    x={x}
                    y={y - 15}
                    textAnchor="middle"
                    fontSize={fontSize.tooltip}
                    fill="white"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    ₱{d.amount.toLocaleString()}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p className="text-sm">Loading sales data...</p>
      </div>
    )
  }

  const chartHeight = 250
  const padding = 50

  return (
    <>
      <div className="space-y-4 relative">
        {/* Expand Button */}
        <button
          onClick={() => setShowModal(true)}
          className="absolute top-0 right-0 p-2 text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200 z-10"
          title="Expand view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-blue-200 text-blue-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Date Filter Buttons */}
          <div className="flex gap-1">
            {([
              { value: 'year', label: 'Full Year' },
              { value: 'first-half', label: 'Jan - Jun' },
              { value: 'second-half', label: 'Jul - Dec' },
            ] as { value: DateFilter; label: string }[]).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setDateFilter(filter.value)}
                className={`px-4 py-2 font-medium text-sm transition-all ${
                  dateFilter === filter.value
                    ? 'bg-blue-600 text-white border border-blue-700'
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white border border-blue-200 p-4 shadow-sm">
          {renderChart(chartHeight, padding, { yAxis: 13, xAxis: 14, tooltip: 14 })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-blue-200">
              <h3 className="text-lg font-bold text-blue-900">Sales Overview</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-blue-200 text-blue-900 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <div className="flex gap-1">
                  {([
                    { value: 'year', label: 'Full Year' },
                    { value: 'first-half', label: 'Jan - Jun' },
                    { value: 'second-half', label: 'Jul - Dec' },
                  ] as { value: DateFilter; label: string }[]).map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setDateFilter(filter.value)}
                      className={`px-4 py-2 font-medium text-sm transition-all ${
                        dateFilter === filter.value
                          ? 'bg-blue-600 text-white border border-blue-700'
                          : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Larger Chart */}
              <div className="bg-white border border-blue-200 p-6 shadow-sm">
                {renderChart(400, 60, { yAxis: 16, xAxis: 16, tooltip: 16 })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
