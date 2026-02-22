import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DatasetFilters from '../components/dataset/DatasetFilters'
import ImageGrid from '../components/dataset/ImageGrid'
import { datasetImages } from '../data/datasetImages'

export default function DatasetPage() {
  const navigate = useNavigate()
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const imagesPerPage = 50

  const handleSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds)
    if (selected) newSelected.add(id)
    else newSelected.delete(id)
    setSelectedIds(newSelected)
  }

  const startIdx = (currentPage - 1) * imagesPerPage
  const endIdx = startIdx + imagesPerPage
  const paginatedImages = datasetImages.slice(startIdx, endIdx)
  const totalPages = Math.ceil(datasetImages.length / imagesPerPage)

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(paginatedImages.map((img) => img.id)) : new Set())
  }

  React.useEffect(() => {
    const handler = (e: CustomEvent) => handleSelectAll(e.detail)
    window.addEventListener('selectAll' as any, handler as EventListener)
    return () => window.removeEventListener('selectAll' as any, handler as EventListener)
  }, [currentPage, paginatedImages.length])

  const handleImageClick = (id: string) => {
    navigate(`/dataset/${id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dataset</h1>
        <p className="text-sm text-slate-500">{datasetImages.length} images</p>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
        <DatasetFilters
          showAnnotations={showAnnotations}
          onToggleAnnotations={() => setShowAnnotations(!showAnnotations)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedCount={selectedIds.size}
        />
      </div>

      {/* Image grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        {viewMode === 'grid' ? (
          <ImageGrid
            images={paginatedImages}
            showAnnotations={showAnnotations}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onImageClick={handleImageClick}
          />
        ) : (
          <div className="text-center py-12 text-slate-400">List view coming soon.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Images per page:</span>
          <select
            value={imagesPerPage}
            className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-slate-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            &lt;
          </button>
          <span className="text-sm text-slate-600 px-2">
            {startIdx + 1}-{Math.min(endIdx, datasetImages.length)} of {datasetImages.length}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-slate-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  )
}
