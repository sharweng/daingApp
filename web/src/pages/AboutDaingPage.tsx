import React from 'react'

export default function AboutDaingPage(){
  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-lg">
        <h2 className="text-xl font-semibold text-blue-900">About Daing</h2>
        <p className="text-sm text-slate-700 mt-2">Daing (dried fish) is a traditional product. This page explains types and grading criteria.</p>
      </div>

      <div className="card bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-lg">
        <h3 className="font-semibold text-blue-900">Grading Criteria</h3>
        <ul className="mt-3 list-disc list-inside text-sm text-slate-700">
          <li>Appearance (color, uniformity)</li>
          <li>Texture (dryness, softness)</li>
          <li>Odor (freshness)</li>
        </ul>
      </div>

      <div className="card bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-lg">
        <h3 className="font-semibold text-blue-900">Types of Daing</h3>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          {['danggit','galunggong','espada','bangus','pusit'].map(t=> (
            <div key={t} className="p-3 bg-blue-100 text-blue-900 font-semibold border border-blue-300 rounded-lg text-center shadow-sm hover:shadow-md transition-shadow">{t}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
