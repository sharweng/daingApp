/**
 * AdminReportPanel — Downloadable analytics report for admin dashboard.
 * Accordion-style floating panel with filters, metrics toggle, preview, PDF download.
 * Adapts to whichever tab (section) is active.
 */
import React, { useState, useRef } from 'react'
import {
  Paper, Text, Button, Group, Badge, Collapse,
  RangeSlider, Checkbox, ActionIcon, Loader,
} from '@mantine/core'
import { DatePickerInput, DatesRangeValue } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { X, FileText, Eye, Download, Filter, BarChart2, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─────────────────────────────────────── Types ───
interface KpiItem {
  label: string
  value: string
  change: number
  subtitle: string
}

interface ChartPoint { period: string; value: number }

interface ProgressItem {
  label: string
  value: number
  max: number
  description: string
}

interface DonutSlice { label: string; value: number; color: string }

interface TableRow { id: string; cols: string[] }

interface SectionData {
  kpis: KpiItem[]
  chartTitle: string
  chartData: ChartPoint[]
  chartColor: string
  progressA: { title: string; subtitle: string; items: ProgressItem[] }
  progressB: { title: string; subtitle: string; items: ProgressItem[] }
  donut: { title: string; slices: DonutSlice[] }
  table: { headers: string[]; rows: TableRow[] }
}

interface AdminReportFilters {
  dateRange: DatesRangeValue
  valueMin: number
  valueMax: number
}

interface AdminReportMetrics {
  kpiSummary: boolean
  chartData: boolean
  tableData: boolean
}

interface AdminReportPanelProps {
  open: boolean
  onClose: () => void
  section: string
  sectionLabel: string
  data: SectionData
}

const DEFAULT_FILTERS: AdminReportFilters = {
  dateRange: [null, null],
  valueMin: 0,
  valueMax: 100000,
}

const DEFAULT_METRICS: AdminReportMetrics = {
  kpiSummary: true,
  chartData: true,
  tableData: true,
}

// ─────────────────────────────────── Helpers ─────
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─────────────────────────────── Preview ─────────
function ReportPreview({
  data,
  sectionLabel,
  filters,
  metrics,
}: {
  data: SectionData
  sectionLabel: string
  filters: AdminReportFilters
  metrics: AdminReportMetrics
}) {
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
            <p className="font-bold text-base">Admin Analytics Report</p>
            <p className="text-blue-100 text-[11px] mt-0.5">{sectionLabel} Section</p>
          </div>
          <div className="text-right text-[10px] text-blue-100">
            <p>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Period: {rangeLabel}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI Strip */}
        {metrics.kpiSummary && (
          <div className="grid grid-cols-4 gap-2">
            {data.kpis.map((kpi, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide truncate">{kpi.label}</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{kpi.value}</p>
                <p className={`text-[9px] mt-0.5 ${kpi.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart data as table */}
        {metrics.chartData && data.chartData.length > 0 && (
          <div>
            <p className="font-semibold text-slate-700 mb-2 text-[11px] uppercase tracking-wide">{data.chartTitle} — Timeline</p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Period</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.chartData.slice(0, 6).map((d, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-3 py-1.5">{d.period}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{d.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.chartData.length > 6 && (
                <div className="text-center text-[10px] text-slate-400 py-1.5 border-t border-slate-100 bg-slate-50">
                  + {data.chartData.length - 6} more (shown in PDF)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data table preview */}
        {metrics.tableData && data.table.rows.length > 0 && (
          <div>
            <p className="font-semibold text-slate-700 mb-2 text-[11px] uppercase tracking-wide">{sectionLabel} Data</p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {data.table.headers.map((h, i) => (
                      <th key={i} className="text-left px-2 py-2 font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.table.rows.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      {row.cols.map((c, ci) => (
                        <td key={ci} className="px-2 py-1.5 truncate max-w-[80px]">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.table.rows.length > 5 && (
                <div className="text-center text-[10px] text-slate-400 py-1.5 border-t border-slate-100 bg-slate-50">
                  + {data.table.rows.length - 5} more rows (shown in PDF)
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-[9px] text-slate-400 text-center pt-1">
          Value filter: {filters.valueMin.toLocaleString()} – {filters.valueMax.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────── PDF Generator ───
function generatePDF(
  data: SectionData,
  sectionLabel: string,
  filters: AdminReportFilters,
  metrics: AdminReportMetrics,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = margin

  const rangeLabel =
    filters.dateRange[0] && filters.dateRange[1]
      ? `${fmtDate(filters.dateRange[0])} – ${fmtDate(filters.dateRange[1])}`
      : 'All time'

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Admin Analytics Report — ${sectionLabel}`, margin, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Daing Grader Platform`, margin, 17)
  doc.text(`Period: ${rangeLabel}`, margin, 22)
  const genDate = `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
  doc.text(genDate, pageW - margin - doc.getTextWidth(genDate), 22)
  y = 36

  doc.setTextColor(30, 30, 30)

  // ── KPI Summary ────────────────────────────────────────────
  if (metrics.kpiSummary) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('KEY METRICS', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value', 'Change', 'Description']],
      body: data.kpis.map(k => [k.label, k.value, `${k.change >= 0 ? '+' : ''}${k.change}%`, k.subtitle]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Chart Timeline ────────────────────────────────────────
  if (metrics.chartData && data.chartData.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${data.chartTitle.toUpperCase()} — TIMELINE`, margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Period', 'Value']],
      body: data.chartData.map(d => [d.period, d.value.toLocaleString()]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Progress Sections ─────────────────────────────────────
  if (metrics.kpiSummary) {
    // Progress A
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(data.progressA.title.toUpperCase(), margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Value', 'Max', 'Percentage']],
      body: data.progressA.items.map(it => [
        it.label,
        it.value.toLocaleString(),
        it.max.toLocaleString(),
        `${((it.value / it.max) * 100).toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6

    // Progress B
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.text(data.progressB.title.toUpperCase(), margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Value', 'Max', 'Percentage']],
      body: data.progressB.items.map(it => [
        it.label,
        it.value.toLocaleString(),
        it.max.toLocaleString(),
        `${((it.value / it.max) * 100).toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6

    // Donut data
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.text(data.donut.title.toUpperCase(), margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Share (%)']],
      body: data.donut.slices.map(s => [s.label, `${s.value}%`]),
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Data Table ────────────────────────────────────────────
  if (metrics.tableData && data.table.rows.length > 0) {
    if (y > 200) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(`${sectionLabel.toUpperCase()} DATA`, margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [data.table.headers],
      body: data.table.rows.map(r => r.cols),
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        doc.setFillColor(37, 99, 235)
        doc.rect(0, 0, pageW, 8, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(`Admin Report — ${sectionLabel}`, margin, 5.5)
        doc.setTextColor(30, 30, 30)
      },
    })
  }

  // ── Footer ────────────────────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150)
    doc.text(
      `Page ${i} of ${pageCount} — Daing Grader Admin Analytics — ${sectionLabel}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 4,
      { align: 'center' }
    )
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const sectionSlug = sectionLabel.toLowerCase().replace(/\s+/g, '-')
  doc.save(`admin-report-${sectionSlug}-${dateStr}.pdf`)
}

// ─────────────────────────────── Main Panel ──────
export default function AdminReportPanel({
  open,
  onClose,
  section,
  sectionLabel,
  data,
}: AdminReportPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [filters, setFilters] = useState<AdminReportFilters>(DEFAULT_FILTERS)
  const [metrics, setMetrics] = useState<AdminReportMetrics>(DEFAULT_METRICS)
  const [showPreview, setShowPreview] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [section1Open, setSection1Open] = useState(true)
  const [section2Open, setSection2Open] = useState(true)

  if (!open) return null

  const handleClear = () => {
    setFilters(DEFAULT_FILTERS)
    setMetrics(DEFAULT_METRICS)
    setShowPreview(false)
  }

  const handleDownload = () => {
    const atLeastOne = metrics.kpiSummary || metrics.chartData || metrics.tableData
    if (!atLeastOne) {
      notifications.show({ title: 'No metrics selected', message: 'Please choose at least one section to include.', color: 'orange' })
      return
    }
    setDownloading(true)
    try {
      generatePDF(data, sectionLabel, filters, metrics)
      notifications.show({ title: 'PDF downloaded', message: `${sectionLabel} analytics report saved.`, color: 'green' })
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to generate PDF.', color: 'red' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 z-50 w-[460px] max-h-[90vh] overflow-y-auto"
      style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.18))' }}
    >
      <Paper shadow="xl" radius="xl" p={0} className="border border-slate-200 overflow-hidden bg-white">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-white" />
            <Text fw={700} size="sm" c="white">Download Report — {sectionLabel}</Text>
          </div>
          <ActionIcon variant="subtle" color="white" onClick={onClose} size="sm">
            <X className="w-4 h-4" />
          </ActionIcon>
        </div>

        <div className="p-4 space-y-3">

          {/* ── Section 1: Filters ──────────────────────── */}
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
                    leftSection={
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    }
                  />
                </div>

                {/* Value Range */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Text size="xs" fw={600} c="dimmed" className="uppercase tracking-wide">Value Range</Text>
                    <Text size="xs" c="dimmed">
                      {filters.valueMin.toLocaleString()} – {filters.valueMax.toLocaleString()}
                    </Text>
                  </div>
                  <RangeSlider
                    min={0}
                    max={100000}
                    step={500}
                    value={[filters.valueMin, filters.valueMax]}
                    onChange={([min, max]) => setFilters(f => ({ ...f, valueMin: min, valueMax: max }))}
                    color="blue"
                    size="sm"
                    label={null}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0</span><span>100,000</span>
                  </div>
                </div>

              </div>
            </Collapse>
          </div>

          {/* ── Section 2: Metrics ──────────────────────── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setSection2Open(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <Text fw={600} size="sm">Section 2 — Report Sections</Text>
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
                <Text size="xs" c="dimmed" mb={8}>Choose what sections to include in the PDF report:</Text>

                <div
                  onClick={() => setMetrics(m => ({ ...m, kpiSummary: !m.kpiSummary }))}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    metrics.kpiSummary ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={metrics.kpiSummary}
                    onChange={() => {}}
                    color="green"
                    size="sm"
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <Text size="sm" fw={600}>KPI Summary & Breakdowns</Text>
                    <Text size="xs" c="dimmed">Key metrics, progress bars, and distribution data</Text>
                  </div>
                  {metrics.kpiSummary && <Badge ml="auto" size="xs" color="green">Included</Badge>}
                </div>

                <div
                  onClick={() => setMetrics(m => ({ ...m, chartData: !m.chartData }))}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    metrics.chartData ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={metrics.chartData}
                    onChange={() => {}}
                    color="blue"
                    size="sm"
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <Text size="sm" fw={600}>Chart Timeline Data</Text>
                    <Text size="xs" c="dimmed">Monthly trend values in tabular format</Text>
                  </div>
                  {metrics.chartData && <Badge ml="auto" size="xs" color="blue">Included</Badge>}
                </div>

                <div
                  onClick={() => setMetrics(m => ({ ...m, tableData: !m.tableData }))}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    metrics.tableData ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={metrics.tableData}
                    onChange={() => {}}
                    color="violet"
                    size="sm"
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <Text size="sm" fw={600}>Full Data Table</Text>
                    <Text size="xs" c="dimmed">All records from the {sectionLabel.toLowerCase()} data table</Text>
                  </div>
                  {metrics.tableData && <Badge ml="auto" size="xs" color="violet">Included</Badge>}
                </div>
              </div>
            </Collapse>
          </div>

          {/* ── Section 3: Actions ──────────────────────── */}
          <div className="border border-slate-200 rounded-xl px-4 py-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <Text size="xs" fw={600} c="dimmed" className="uppercase tracking-wide">Section 3 — Actions</Text>
              <Text size="xs" c="dimmed">
                {data.table.rows.length} record{data.table.rows.length !== 1 ? 's' : ''} in table
              </Text>
            </div>

            {/* Preview */}
            <Collapse in={showPreview}>
              <div className="mb-3">
                <ReportPreview
                  data={data}
                  sectionLabel={sectionLabel}
                  filters={filters}
                  metrics={metrics}
                />
              </div>
            </Collapse>

            <Group grow gap="xs">
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
