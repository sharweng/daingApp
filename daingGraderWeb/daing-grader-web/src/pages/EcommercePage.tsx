/**
 * E-commerce page - placeholder for future implementation.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import PageTitleHero from '../components/layout/PageTitleHero'
import { ShoppingBag } from 'lucide-react'

export default function EcommercePage() {
  return (
    <div className="space-y-8">
      <PageTitleHero
        title="E-commerce"
        subtitle="Manage listings and browse dried fish products."
        backgroundImage="/assets/page-hero/grade.jpg"
      />

      <div className="card border border-sidebar-subtle shadow-sidebar-subtle max-w-xl text-center py-16">
        <ShoppingBag className="w-20 h-20 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Not implemented yet</h2>
        <p className="text-slate-600 mb-6">
          The e-commerce section is planned for a future release. Check back later for listings and seller tools.
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
