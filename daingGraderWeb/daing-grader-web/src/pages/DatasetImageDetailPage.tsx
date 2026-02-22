import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getImageById } from '../data/datasetImages'

export default function DatasetImageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const image = id ? getImageById(id) : undefined

  if (!image) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/dataset')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dataset
        </button>
        <p className="text-slate-500">Image not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/dataset')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dataset
      </button>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <div className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden">
            {image.url ? (
              <img src={image.url} alt={image.filename} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="w-24 h-24 bg-slate-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm">Image placeholder</span>
                </div>
              </div>
            )}
            {image.hasAnnotations && image.annotations?.length && (
              <div className="absolute inset-2 border-2 border-orange-500 rounded pointer-events-none" />
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 truncate" title={image.filename}>
              {image.filename}
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 font-medium">Category / Class</dt>
                <dd className="text-slate-900 mt-0.5">{image.category ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Dimensions</dt>
                <dd className="text-slate-900 mt-0.5">
                  {image.dimensions ? `${image.dimensions.width} × ${image.dimensions.height} px` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Date added</dt>
                <dd className="text-slate-900 mt-0.5">{image.dateAdded ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Annotations</dt>
                <dd className="text-slate-900 mt-0.5">{image.hasAnnotations ? 'Yes' : 'No'}</dd>
              </div>
              {image.description && (
                <div>
                  <dt className="text-slate-500 font-medium">Description</dt>
                  <dd className="text-slate-900 mt-0.5">{image.description}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
