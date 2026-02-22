import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Store, Package, ShoppingCart, Star, Search } from 'lucide-react'
import { getCatalogSellers, type CatalogSeller } from '../services/api'
import PageTitleHero from '../components/layout/PageTitleHero'

export default function SellerListingPage() {
  const [sellers, setSellers] = useState<CatalogSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadSellers = async () => {
      setLoading(true)
      try {
        const res = await getCatalogSellers()
        setSellers(res.sellers || [])
      } catch (err) {
        console.error('Failed to load sellers:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSellers()
  }, [])

  const filteredSellers = sellers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 w-full min-h-screen">
      <PageTitleHero
        title="Browse Stores"
        subtitle="Discover trusted sellers offering premium quality dried fish products."
        backgroundImage="/assets/daing/danggit/slide1.jfif"
      />

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
        <input
          type="text"
          placeholder="Search stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 border border-blue-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          Loading stores...
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p>No stores found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSellers.map((seller) => (
            <Link
              key={seller.id}
              to={`/store/${seller.id}`}
              className="bg-white border border-blue-200 p-5 hover:border-blue-400 hover:shadow-lg transition-all duration-200 rounded-lg group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200 group-hover:border-blue-400 transition-colors">
                  <Store className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-lg truncate group-hover:text-blue-600 transition-colors">
                    {seller.name}
                  </h3>
                  <p className="text-sm text-slate-500">View Store</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <Package className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">{seller.product_count || 0}</p>
                  <p className="text-xs text-slate-500">Products</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">{(seller.total_sold || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Sold</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
