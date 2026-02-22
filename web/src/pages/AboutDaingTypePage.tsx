import React from 'react'
import { useParams } from 'react-router-dom'
import { getDaingTypeBySlug } from '../data/daingTypes'
import DaingTypeCarousel from '../components/home/DaingTypeCarousel'

export default function AboutDaingTypePage() {
  const { slug } = useParams<{ slug: string }>()
  const type = slug ? getDaingTypeBySlug(slug) : undefined

  if (!type) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">About Daing</h1>
        <p className="text-slate-500">Fish type not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 border-b-2 border-primary pb-2">{type.name}</h1>

      {/* Wide image carousel (at least 3 images) */}
      <div className="w-full">
        <DaingTypeCarousel slides={type.carousel} title={type.name} autoplayMs={5000} />
      </div>

      {/* Information sections below (coconut-page style) */}
      <div className="space-y-8">
        {type.sections.map((section, i) => (
          <section key={i}>
            <h2 className="text-lg font-bold text-slate-900 mb-3">{section.title}</h2>
            <p className="text-slate-600 leading-relaxed">{section.content}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
