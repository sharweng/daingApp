import React, { useState, useEffect } from 'react'
import { Maximize2, X } from 'lucide-react'
import { getSellerSalesCategories, type SalesCategory } from '../services/api'

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

export default function SalesCategoryDonut() {
  const [categories, setCategories] = useState<SalesCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const res = await getSellerSalesCategories()
      setCategories(res.categories || [])
    } catch (error) {
      console.error('Failed to load sales categories:', error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <p className="text-sm">Loading...</p>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <p className="text-sm">No category data available</p>
      </div>
    )
  }

  const total = categories.reduce((sum, c) => sum + c.sold, 0)

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <p className="text-sm">No sales data yet</p>
      </div>
    )
  }

  // Calculate segments sorted by sold count
  const allSegments = categories
    .map((cat, index) => ({
      category: cat.category,
      sold: cat.sold,
      percentage: cat.sold / total,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => b.sold - a.sold)

  // Top 3 for compact view
  const topSegments = allSegments.slice(0, 3)

  const renderDonut = (segments: typeof allSegments, size: number) => {
    const centerX = size / 2
    const centerY = size / 2
    const radius = size * 0.35
    const strokeWidth = size * 0.17
    const circumference = 2 * Math.PI * radius
    let accumulatedOffset = 0

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Segments */}
          {segments.map((seg, index) => {
            const segmentLength = seg.percentage * circumference
            const offset = -accumulatedOffset
            accumulatedOffset += segmentLength

            return (
              <circle
                key={index}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={hoveredIndex === index ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${centerX} ${centerY})`}
                className="cursor-pointer transition-all"
                style={{ 
                  opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.4,
                  transformOrigin: 'center'
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            )
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hoveredIndex !== null ? (
            <>
              <p className="text-sm font-semibold text-blue-900">
                {segments[hoveredIndex].category}
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {segments[hoveredIndex].sold.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                {(segments[hoveredIndex].percentage * 100).toFixed(1)}% sold
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-blue-900">
                {total.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">Total Sold</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        {/* Compact View */}
        <div className="flex flex-col items-center gap-4">
          {renderDonut(topSegments, 200)}

          {/* Top 3 Categories */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {topSegments.map((seg, index) => (
              <div key={index} className="text-center">
                <p className="text-xl font-bold" style={{ color: seg.color }}>
                  {seg.sold.toLocaleString()}
                </p>
                <p className="text-xs font-medium text-slate-700 truncate">{seg.category}</p>
              </div>
            ))}
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setShowModal(true)}
            className="absolute top-0 right-0 p-2 text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200"
            title="Expand view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-blue-200">
              <h3 className="text-lg font-bold text-blue-900">Sales by Category</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col items-center gap-6">
              {renderDonut(allSegments, 300)}

              {/* All Categories */}
              <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                {allSegments.map((seg, index) => (
                  <div key={index} className="text-center p-3 border border-slate-200 bg-slate-50">
                    <p className="text-2xl font-bold" style={{ color: seg.color }}>
                      {seg.sold.toLocaleString()}
                    </p>
                    <p className="text-sm font-medium text-slate-700 mt-1">{seg.category}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(seg.percentage * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
