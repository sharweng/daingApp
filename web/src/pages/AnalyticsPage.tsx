/**
 * Analytics page - placeholder for future implementation.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import PageTitleHero from '../components/layout/PageTitleHero'
import { BarChart2 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageTitleHero
        title="Analytics"
        subtitle="View grading statistics, trends, and insights."
        backgroundImage="/assets/page-hero/hero-bg.jpg"
      />

      <div className="bg-white border border-black rounded-xl shadow-sidebar-subtle max-w-xl text-center py-16 p-6">
        <BarChart2 className="w-20 h-20 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Not implemented yet</h2>
        <p className="text-slate-600 mb-6">
          Analytics features are planned for a future release. Check back later for grading statistics and insights.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
