/**
 * ReportPanel — Downloadable Analytics Report Generator for sellers.
 * Shows as a floating accordion-style drawer below the "Download Report" button.
 * Uses Mantine for UI, jsPDF + jspdf-autotable for PDF generation.
 */
import React, { useState, useRef } from 'react'
import {
  Paper, Text, Button, Group, Divider, Badge, Collapse,
  RangeSlider, Checkbox, ActionIcon, Loader,
} from '@mantine/core'
import { DatePickerInput, DatesRangeValue } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { X, FileText, Eye, Download, Filter, BarChart2, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RecentOrder, SalesCategory, SellerKPIs } from '../../services/api'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface ReportFilters {
  dateRange: DatesRangeValue
  priceMin: number
  priceMax: number
  categories: string[]    // empty = all
  ratingMin: number       // 0-5
  ratingMax: number
}

export interface ReportMetrics {
  totalSales: boolean
  totalOrders: boolean
  totalProductsSold: boolean
}

interface ReportPanelProps {
  open: boolean
  onClose: () => void
  orders: RecentOrder[]
  salesCategories: SalesCategory[]
  kpis: SellerKPIs | null
  salesData: { period: string; amount: number }[]
  sellerName?: string
}

const DEFAULT_FILTERS: ReportFilters = {
  dateRange: [null, null],
  priceMin: 0,
  priceMax: 100000,
  categories: [],
  ratingMin: 0,
  ratingMax: 5,
}

const DEFAULT_METRICS: ReportMetrics = {
  totalSales: true,
  totalOrders: true,
  totalProductsSold: true,
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function fmtPeso(v: number) {
  return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function applyFilters(orders: RecentOrder[], filters: ReportFilters): RecentOrder[] {
  return orders.filter(order => {
    if (order.total < filters.priceMin || order.total > filters.priceMax) return false
    if (filters.dateRange[0] && filters.dateRange[1]) {
      const d = new Date(order.created_at)
      const start = new Date(filters.dateRange[0])
      const end = new Date(filters.dateRange[1]); end.setHours(23, 59, 59, 999)
      if (d < start || d > end) return false
    }
    return true
  })
}

// ─────────────────────────────────────────────────────────────
// Preview component
// ─────────────────────────────────────────────────────────────
function ReportPreview({
  filteredOrders,
  salesCategories,
  kpis,
  salesData,
  filters,
  metrics,
  sellerName,
}: {
  filteredOrders: RecentOrder[]
  salesCategories: SalesCategory[]
  kpis: SellerKPIs | null
  salesData: { period: string; amount: number }[]
  filters: ReportFilters
  metrics: ReportMetrics
  sellerName?: string
}) {
  const totalSales = filteredOrders.reduce((s, o) => s + o.total, 0)
  const totalProductsSold = filteredOrders.reduce((s, o) => s + (o.items_count ?? 0), 0)

  const rangeLabel =
    filters.dateRange[0] && filters.dateRange[1]
      ? `${fmtDate(filters.dateRange[0])} – ${fmtDate(filters.dateRange[1])}`
      : 'All time'

  return (
    <div className="border border-slate-200 rounded-xl bg-white text-slate-800 text-xs overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-base">Analytics Report</p>
            <p className="text-blue-100 text-[11px] mt-0.5">{sellerName ?? 'Your Store'}</p>
          </div>
          <div className="text-right text-[10px] text-blue-100">
            <p>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Period: {rangeLabel}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI Summary Strip */}
        <div className="grid grid-cols-3 gap-3">
          {metrics.totalSales && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Total Sales</p>
              <p className="text-lg font-bold text-green-700 mt-0.5">{fmtPeso(totalSales)}</p>
              <p className="text-[10px] text-green-500">{filteredOrders.length} orders</p>
            </div>
          )}
          {metrics.totalOrders && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Total Orders</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">{filteredOrders.length}</p>
              <p className="text-[10px] text-blue-500">in period</p>
            </div>
          )}
          {metrics.totalProductsSold && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center">
              <p className="text-[10px] text-violet-600 font-semibold uppercase tracking-wide">Products Sold</p>
              <p className="text-lg font-bold text-violet-700 mt-0.5">{totalProductsSold}</p>
              <p className="text-[10px] text-violet-500">units</p>
            </div>
          )}
        </div>

        {/* Sales by Category */}
        {salesCategories.length > 0 && (
          <div>
            <p className="font-semibold text-slate-700 mb-2 text-[11px] uppercase tracking-wide">Sales by Category</p>
            <div className="space-y-1.5">
              {salesCategories.map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-28 truncate">{cat.category}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-8 text-right">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div>
          <p className="font-semibold text-slate-700 mb-2 text-[11px] uppercase tracking-wide">Order Details</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Order ID</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Customer</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Date</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 10).map((o, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-3 py-1.5 font-mono text-[9px]">{o.order_number}</td>
                    <td className="px-3 py-1.5">{o.customer}</td>
                    <td className="px-3 py-1.5 text-slate-500">{fmtDate(o.created_at)}</td>
                    <td className="px-3 py-1.5 capitalize">{o.status}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{fmtPeso(o.total)}</td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400">No orders match the selected filters</td>
                  </tr>
                )}
              </tbody>
            </table>
            {filteredOrders.length > 10 && (
              <div className="text-center text-[10px] text-slate-400 py-1.5 border-t border-slate-100 bg-slate-50">
                + {filteredOrders.length - 10} more orders (shown in PDF)
              </div>
            )}
          </div>
        </div>

        {/* Sales Timeline */}
        {salesData.length > 0 && (
          <div>
            <p className="font-semibold text-slate-700 mb-2 text-[11px] uppercase tracking-wide">Sales Timeline</p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Period</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.slice(0, 8).map((d, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-3 py-1.5">{d.period}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{fmtPeso(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-[9px] text-slate-400 text-center pt-1">
          Price filter: {fmtPeso(filters.priceMin)} – {fmtPeso(filters.priceMax)} &nbsp;|&nbsp; Rating: {filters.ratingMin}★ – {filters.ratingMax}★
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PDF Generator
// ─────────────────────────────────────────────────────────────
function generatePDF(
  filteredOrders: RecentOrder[],
  salesCategories: SalesCategory[],
  kpis: SellerKPIs | null,
  salesData: { period: string; amount: number }[],
  filters: ReportFilters,
  metrics: ReportMetrics,
  sellerName: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = margin

  const totalSales = filteredOrders.reduce((s, o) => s + o.total, 0)
  const totalProductsSold = filteredOrders.reduce((s, o) => s + (o.items_count ?? 0), 0)

  const rangeLabel =
    filters.dateRange[0] && filters.dateRange[1]
      ? `${fmtDate(filters.dateRange[0])} – ${fmtDate(filters.dateRange[1])}`
      : 'All time'

  // ── Header band ──────────────────────────────────────────
  doc.setFillColor(37, 99, 235)   // blue-600
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Analytics Report', margin, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(sellerName, margin, 17)
  doc.text(`Period: ${rangeLabel}`, margin, 22)
  const genDate = `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
  doc.text(genDate, pageW - margin - doc.getTextWidth(genDate), 22)
  y = 36

  doc.setTextColor(30, 30, 30)

  // ── KPI Summary ──────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('SUMMARY', margin, y)
  y += 4

  const kpiRows: string[][] = []
  if (metrics.totalSales) kpiRows.push(['Total Sales', fmtPeso(totalSales), `Across ${filteredOrders.length} order(s)`])
  if (metrics.totalOrders) kpiRows.push(['Total Orders', String(filteredOrders.length), 'In selected period'])
  if (metrics.totalProductsSold) kpiRows.push(['Products Sold (units)', String(totalProductsSold), 'Total item quantity'])

  if (kpiRows.length) {
    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value', 'Description']],
      body: kpiRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Sales by Category ─────────────────────────────────────
  if (salesCategories.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('SALES BY CATEGORY', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Items Sold', 'Share (%)']],
      body: salesCategories.map(c => [c.category, String(c.sold), `${c.percentage}%`]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Order Details ─────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ORDER DETAILS', margin, y)
  y += 4

  if (filteredOrders.length === 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(150)
    doc.text('No orders match the selected filters.', margin, y + 4)
    doc.setTextColor(30, 30, 30)
    y += 14
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Order ID', 'Customer', 'Date', 'Status', 'Items', 'Total (₱)']],
      body: filteredOrders.map(o => [
        o.order_number ?? o.id,
        o.customer,
        fmtDate(o.created_at),
        o.status.charAt(0).toUpperCase() + o.status.slice(1),
        String(o.items_count ?? 0),
        o.total.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 5: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        // Re-draw header on each page
        doc.setFillColor(37, 99, 235)
        doc.rect(0, 0, pageW, 8, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('Analytics Report — ' + sellerName, margin, 5.5)
        doc.setTextColor(30, 30, 30)
      },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Sales Timeline ────────────────────────────────────────
  if (salesData.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('SALES TIMELINE', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Period', 'Revenue (₱)']],
      body: salesData.map(d => [d.period, d.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })]),
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Footer on last page ───────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150)
    doc.text(
      `Page ${i} of ${pageCount} — ${sellerName} — Daing Grader Analytics`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    )
    doc.text(
      `Price Range: ${fmtPeso(filters.priceMin)} – ${fmtPeso(filters.priceMax)} | Rating: ${filters.ratingMin}★ – ${filters.ratingMax}★`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 2,
      { align: 'center' }
    )
  }

  // Generate filename
  const dateStr = new Date().toISOString().slice(0, 10)
  doc.save(`analytics-report-${dateStr}.pdf`)
}

// ─────────────────────────────────────────────────────────────
// Main Panel
// ─────────────────────────────────────────────────────────────
export default function ReportPanel({
  open,
  onClose,
  orders,
  salesCategories,
  kpis,
  salesData,
  sellerName = 'Your Store',
}: ReportPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS)
  const [metrics, setMetrics] = useState<ReportMetrics>(DEFAULT_METRICS)
  const [showPreview, setShowPreview] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Collapse/expand sections
  const [section1Open, setSection1Open] = useState(true)
  const [section2Open, setSection2Open] = useState(true)

  if (!open) return null

  const filteredOrders = applyFilters(orders, filters)
  const categoryOptions = Array.from(new Set(salesCategories.map(c => c.category)))

  const handleClear = () => {
    setFilters(DEFAULT_FILTERS)
    setMetrics(DEFAULT_METRICS)
    setShowPreview(false)
  }

  const handleDownload = () => {
    const atLeastOne = metrics.totalSales || metrics.totalOrders || metrics.totalProductsSold
    if (!atLeastOne) {
      notifications.show({ title: 'No metrics selected', message: 'Please choose at least one metric to include.', color: 'orange' })
      return
    }
    setDownloading(true)
    try {
      generatePDF(filteredOrders, salesCategories, kpis, salesData, filters, metrics, sellerName)
      notifications.show({ title: 'PDF downloaded', message: 'Your analytics report has been saved.', color: 'green' })
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to generate PDF.', color: 'red' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 z-50 w-[440px] max-h-[90vh] overflow-y-auto"
      style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.18))' }}
    >
      <Paper shadow="xl" radius="xl" p={0} className="border border-slate-200 overflow-hidden bg-white">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-white" />
            <Text fw={700} size="sm" c="white">Download Analytics Report</Text>
          </div>
          <ActionIcon variant="subtle" color="white" onClick={onClose} size="sm">
            <X className="w-4 h-4" />
          </ActionIcon>
        </div>

        <div className="p-4 space-y-3">

          {/* ── Section 1: Filters ───────────────────────────── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setSection1Open(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <Text fw={600} size="sm">Section 1 — Filters</Text>
                <Badge size="xs" color="blue" variant="light">optional</Badge>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${section1Open ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <Collapse in={section1Open}>
              <div className="px-4 py-4 space-y-4 bg-white">

                {/* Date Range */}
                <div>
                  <Text size="xs" fw={600} c="dimmed" mb={6} className="uppercase tracking-wide">Date Range</Text>
                  <DatePickerInput
                    type="range"
                    placeholder="All time (no filter)"
                    value={filters.dateRange}
                    onChange={(val) => setFilters(f => ({ ...f, dateRange: val }))}
                    clearable
                    size="xs"
                    radius="md"
                    leftSection={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  />
                </div>

                {/* Price Range */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Text size="xs" fw={600} c="dimmed" className="uppercase tracking-wide">Price Range</Text>
                    <Text size="xs" c="dimmed">
                      {fmtPeso(filters.priceMin)} – {fmtPeso(filters.priceMax)}
                    </Text>
                  </div>
                  <RangeSlider
                    min={0}
                    max={100000}
                    step={500}
                    value={[filters.priceMin, filters.priceMax]}
                    onChange={([min, max]) => setFilters(f => ({ ...f, priceMin: min, priceMax: max }))}
                    color="blue"
                    size="sm"
                    label={null}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>₱0</span><span>₱100,000</span>
                  </div>
                </div>

                {/* By Category */}
                {categoryOptions.length > 0 && (
                  <div>
                    <Text size="xs" fw={600} c="dimmed" mb={8} className="uppercase tracking-wide">By Category</Text>
                    <div className="grid grid-cols-2 gap-1.5">
                      {categoryOptions.map(cat => (
                        <Checkbox
                          key={cat}
                          label={cat}
                          size="xs"
                          checked={filters.categories.length === 0 || filters.categories.includes(cat)}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              const next = filters.categories.length === 0
                                ? categoryOptions.filter(c => c !== cat)
                                : [...filters.categories, cat]
                              // if all selected → revert to [] (meaning all)
                              setFilters(f => ({
                                ...f,
                                categories: next.length === categoryOptions.length ? [] : next,
                              }))
                            } else {
                              const next = filters.categories.length === 0
                                ? categoryOptions.filter(c => c !== cat)
                                : filters.categories.filter(c => c !== cat)
                              setFilters(f => ({ ...f, categories: next }))
                            }
                          }}
                        />
                      ))}
                    </div>
                    {filters.categories.length === 0
                      ? <Text size="10px" c="dimmed" mt={4}>All categories included</Text>
                      : <Text size="10px" c="blue" mt={4}>{filters.categories.length} of {categoryOptions.length} selected</Text>
                    }
                  </div>
                )}

                {/* Rating Range */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Text size="xs" fw={600} c="dimmed" className="uppercase tracking-wide">Rating Range</Text>
                    <Text size="xs" c="dimmed">{filters.ratingMin}★ – {filters.ratingMax}★</Text>
                  </div>
                  <RangeSlider
                    min={0}
                    max={5}
                    step={0.5}
                    value={[filters.ratingMin, filters.ratingMax]}
                    onChange={([min, max]) => setFilters(f => ({ ...f, ratingMin: min, ratingMax: max }))}
                    color="yellow"
                    size="sm"
                    label={null}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0★</span><span>5★</span>
                  </div>
                </div>

              </div>
            </Collapse>
          </div>

          {/* ── Section 2: Metrics ───────────────────────────── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setSection2Open(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <Text fw={600} size="sm">Section 2 — Analytics Metrics</Text>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${section2Open ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <Collapse in={section2Open}>
              <div className="px-4 py-4 bg-white space-y-2">
                <Text size="xs" c="dimmed" mb={8}>Choose what data sections appear in the report:</Text>

                <div
                  onClick={() => setMetrics(m => ({ ...m, totalSales: !m.totalSales }))}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    metrics.totalSales ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={metrics.totalSales}
                    onChange={() => {}}
                    color="green"
                    size="sm"
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <Text size="sm" fw={600}>Total Sales</Text>
                    <Text size="xs" c="dimmed">Revenue earned from orders in the selected period</Text>
                  </div>
                  {metrics.totalSales && <Badge ml="auto" size="xs" color="green">Included</Badge>}
                </div>

                <div
                  onClick={() => setMetrics(m => ({ ...m, totalOrders: !m.totalOrders }))}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    metrics.totalOrders ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={metrics.totalOrders}
                    onChange={() => {}}
                    color="blue"
                    size="sm"
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <Text size="sm" fw={600}>Total Number of Orders</Text>
                    <Text size="xs" c="dimmed">Count of all orders placed in the period</Text>
                  </div>
                  {metrics.totalOrders && <Badge ml="auto" size="xs" color="blue">Included</Badge>}
                </div>

                <div
                  onClick={() => setMetrics(m => ({ ...m, totalProductsSold: !m.totalProductsSold }))}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    metrics.totalProductsSold ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={metrics.totalProductsSold}
                    onChange={() => {}}
                    color="violet"
                    size="sm"
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <Text size="sm" fw={600}>Total Products Sold</Text>
                    <Text size="xs" c="dimmed">Total units/items sold across all orders</Text>
                  </div>
                  {metrics.totalProductsSold && <Badge ml="auto" size="xs" color="violet">Included</Badge>}
                </div>
              </div>
            </Collapse>
          </div>

          {/* ── Section 3: Actions ───────────────────────────── */}
          <div className="border border-slate-200 rounded-xl px-4 py-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <Text size="xs" fw={600} c="dimmed" className="uppercase tracking-wide">Section 3 — Actions</Text>
              <Text size="xs" c="dimmed">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} matched
              </Text>
            </div>

            {/* Preview toggle */}
            <Collapse in={showPreview}>
              <div className="mb-3">
                <ReportPreview
                  filteredOrders={filteredOrders}
                  salesCategories={salesCategories}
                  kpis={kpis}
                  salesData={salesData}
                  filters={filters}
                  metrics={metrics}
                  sellerName={sellerName}
                />
              </div>
            </Collapse>

            <Group grow gap="xs">
              {/* Clear */}
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                radius="md"
                leftSection={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleClear}
              >
                Clear
              </Button>

              {/* Preview */}
              <Button
                variant={showPreview ? 'filled' : 'light'}
                color="blue"
                size="xs"
                radius="md"
                leftSection={<Eye className="w-3.5 h-3.5" />}
                onClick={() => setShowPreview(v => !v)}
              >
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>

              {/* Download PDF */}
              <Button
                variant="filled"
                color="indigo"
                size="xs"
                radius="md"
                leftSection={downloading ? <Loader size={12} color="white" /> : <Download className="w-3.5 h-3.5" />}
                onClick={handleDownload}
                disabled={downloading}
              >
                Download PDF
              </Button>
            </Group>
          </div>

        </div>
      </Paper>
    </div>
  )
}
