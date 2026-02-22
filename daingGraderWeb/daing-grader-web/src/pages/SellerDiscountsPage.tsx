import React, { useState, useEffect } from 'react'
import { Trash2, Edit2, Eye, Plus, Loader, AlertCircle } from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import VoucherDetailModal from '../components/vouchers/VoucherDetailModal'
import CreateVoucherModal from '../components/vouchers/CreateVoucherModal'
import { listVouchers, deleteVoucher } from '../services/api'

export default function SellerDiscountsPage() {
  const [vouchers, setVouchers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; voucher: any | null }>({
    isOpen: false,
    voucher: null,
  })
  const [createModal, setCreateModal] = useState<{ isOpen: boolean; editing: any | null }>({
    isOpen: false,
    editing: null,
  })

  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchVouchers()
  }, [filterStatus])

  const fetchVouchers = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await listVouchers(filterStatus)
      setVouchers(response.vouchers || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load vouchers')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!window.confirm('Are you sure you want to delete this voucher code?')) return

    setDeleteLoading(voucherId)
    try {
      await deleteVoucher(voucherId)
      setVouchers((prev) => prev.filter((v) => v._id !== voucherId))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete voucher')
    } finally {
      setDeleteLoading(null)
    }
  }

  const filteredVouchers = vouchers.filter((v) =>
    v.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No limit'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isExpired = (voucher: any) => {
    return voucher.expiration_date && new Date(voucher.expiration_date) <= new Date()
  }

  const getStatus = (voucher: any) => {
    if (isExpired(voucher)) return { label: 'Expired', color: 'text-red-600 bg-red-50' }
    if (!voucher.active) return { label: 'Inactive', color: 'text-slate-600 bg-slate-50' }
    if (voucher.max_uses && voucher.current_uses >= voucher.max_uses) {
      return { label: 'Used Up', color: 'text-orange-600 bg-orange-50' }
    }
    return { label: 'Active', color: 'text-emerald-600 bg-emerald-50' }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageTitleHero title="Discount & Voucher Codes" subtitle="Create and manage your discount codes" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Discount Codes</h1>
            <p className="text-slate-600 mt-1">Manage and track your voucher codes</p>
          </div>
          <button
            onClick={() => setCreateModal({ isOpen: true, editing: null })}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-600 font-semibold">Error loading vouchers</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search code (e.g., DAING20)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="expired">Expired Only</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading vouchers...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredVouchers.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center">
            <p className="text-slate-600 text-lg mb-4">No discount codes yet</p>
            <p className="text-slate-500 text-sm mb-6">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first voucher code to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setCreateModal({ isOpen: true, editing: null })}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Create First Code
              </button>
            )}
          </div>
        )}

        {/* Vouchers Table */}
        {!loading && filteredVouchers.length > 0 && (
          <div className="bg-white border border-blue-200 shadow-sm overflow-hidden transition-all duration-300 rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-200">
                  <tr>
                    <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Code</th>
                    <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Value</th>
                    <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Uses</th>
                    <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Expires</th>
                    <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Status</th>
                    <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {filteredVouchers.map((voucher) => {
                    const status = getStatus(voucher)
                    return (
                      <tr key={voucher._id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="font-bold text-base text-blue-600">{voucher.code}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-base text-slate-700">
                            {voucher.discount_type === 'percentage' ? 'Percentage' : 'Fixed'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-base text-slate-900">
                            {voucher.discount_type === 'percentage'
                              ? `${voucher.value}%`
                              : `₱${voucher.value.toLocaleString()}`}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-base text-slate-700">
                            {voucher.current_uses}{voucher.max_uses ? ` / ${voucher.max_uses}` : ' / ∞'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-base text-slate-600">
                            {voucher.expiration_date ? formatDate(voucher.expiration_date) : 'No limit'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-sm font-medium border rounded ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                setDetailModal({ isOpen: true, voucher: { ...voucher, seller_name: 'You' } })
                              }
                              className="p-2 hover:bg-blue-100 text-slate-500 hover:text-blue-700 border border-transparent hover:border-blue-300 transition-all"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCreateModal({ isOpen: true, editing: voucher })}
                              className="p-2 hover:bg-blue-100 text-slate-500 hover:text-blue-700 border border-transparent hover:border-blue-300 transition-all"
                              title="Edit code"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoucher(voucher._id)}
                              disabled={deleteLoading === voucher._id}
                              className="p-2 hover:bg-red-100 text-slate-500 hover:text-red-700 border border-transparent hover:border-red-300 transition-all disabled:opacity-50"
                              title="Delete code"
                            >
                              {deleteLoading === voucher._id ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <VoucherDetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, voucher: null })}
        voucher={detailModal.voucher}
      />
      <CreateVoucherModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ isOpen: false, editing: null })}
        onSuccess={fetchVouchers}
        editingVoucher={createModal.editing}
      />
    </div>
  )
}
