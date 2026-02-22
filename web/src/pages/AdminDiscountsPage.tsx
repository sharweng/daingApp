import React, { useState, useEffect } from 'react'
import { Trash2, Edit2, Eye, Plus, Loader, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import PageTitleHero from '../components/layout/PageTitleHero'
import VoucherDetailModal from '../components/vouchers/VoucherDetailModal'
import CreateVoucherModal from '../components/vouchers/CreateVoucherModal'
import { listVouchers, deleteVoucher } from '../services/api'

export default function AdminDiscountsPage() {
  const [allVouchers, setAllVouchers] = useState<any[]>([])
  const [adminVouchers, setAdminVouchers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [expandedSections, setExpandedSections] = useState({
    adminOwned: true,
    allSellers: true,
  })

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
      // Fetch all vouchers (both admin's and others')
      const response = await listVouchers(filterStatus)
      const vouchers = response.vouchers || []

      // Note: This assumes the API returns all vouchers with seller_id
      // We need to separate them, but we don't know current user ID from this component
      // For now, we'll fetch separately
      setAllVouchers(vouchers)
      // In a real implementation, filter adminVouchers based on current user ID
      setAdminVouchers([])
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
      setAdminVouchers((prev) => prev.filter((v) => v._id !== voucherId))
      setAllVouchers((prev) => prev.filter((v) => v._id !== voucherId))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete voucher')
    } finally {
      setDeleteLoading(null)
    }
  }

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

  const filteredAdminVouchers = adminVouchers.filter((v) =>
    v.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSellerVouchers = allVouchers.filter((v) =>
    v.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const VoucherTable = ({ vouchers, isAdmin = false, loading = false }: { vouchers: any[]; isAdmin?: boolean; loading?: boolean }) => {
    if (loading) {
      return (
        <div className="px-6 py-12 text-center">
          <Loader className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-slate-600 text-sm">Loading...</p>
        </div>
      )
    }

    if (vouchers.length === 0) {
      return (
        <div className="px-6 py-8 text-center text-slate-500 text-sm">
          {isAdmin ? 'No admin-created voucher codes' : 'No seller voucher codes'}
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-200">
            <tr>
              <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Code</th>
              {!isAdmin && <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Seller</th>}
              <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Value</th>
              <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Uses</th>
              <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Expires</th>
              <th className="text-left px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Status</th>
              <th className="text-center px-4 py-4 text-sm font-bold text-blue-900 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {vouchers.map((voucher: any) => {
              const status = getStatus(voucher)
              return (
                <tr key={voucher._id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <span className="font-bold text-base text-blue-600">{voucher.code}</span>
                  </td>
                  {!isAdmin && (
                    <td className="px-4 py-4">
                      <span className="text-base text-slate-700">{voucher.seller_name || 'Unknown'}</span>
                    </td>
                  )}
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
                        onClick={() => setDetailModal({ isOpen: true, voucher })}
                        className="p-2 hover:bg-blue-100 text-slate-500 hover:text-blue-700 border border-transparent hover:border-blue-300 transition-all"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
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
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageTitleHero
        title="Voucher Management System"
        subtitle="Create and manage all discount codes"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Voucher Management</h1>
            <p className="text-slate-600 mt-1">System-wide discount code administration</p>
          </div>
          <button
            onClick={() => setCreateModal({ isOpen: true, editing: null })}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Code
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
              placeholder="Search code..."
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

        {!loading && (
          <>
            {/* Admin Vouchers Section */}
            <div className="bg-white border border-blue-200 shadow-sm overflow-hidden transition-all duration-300 rounded-lg mb-6">
              <div
                className="flex items-center justify-between px-5 py-4 border-b border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors bg-gradient-to-r from-white to-blue-50"
                onClick={() =>
                  setExpandedSections((prev) => ({ ...prev, adminOwned: !prev.adminOwned }))
                }
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-blue-900 text-base">MY VOUCHERS (Admin)</span>
                  <span className="text-sm text-white bg-blue-600 px-2 py-0.5 rounded">{filteredAdminVouchers.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">
                    {!expandedSections.adminOwned ? 'Click to expand' : `Showing ${filteredAdminVouchers.length}`}
                  </span>
                  {expandedSections.adminOwned ? (
                    <ChevronUp className="w-5 h-5 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </div>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  !expandedSections.adminOwned ? 'max-h-0 opacity-0' : 'max-h-[3000px] opacity-100'
                }`}
              >
                {filteredAdminVouchers.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-500">
                    <p>No admin-created voucher codes yet</p>
                    <p className="text-sm mt-2">Create one to get started</p>
                  </div>
                ) : (
                  <VoucherTable vouchers={filteredAdminVouchers} isAdmin={true} />
                )}
              </div>
            </div>

            {/* All Sellers Vouchers Section */}
            <div className="bg-white border border-blue-200 shadow-sm overflow-hidden transition-all duration-300 rounded-lg">
              <div
                className="flex items-center justify-between px-5 py-4 border-b border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors bg-gradient-to-r from-white to-blue-50"
                onClick={() =>
                  setExpandedSections((prev) => ({ ...prev, allSellers: !prev.allSellers }))
                }
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-blue-900 text-base">ALL SELLERS' VOUCHERS</span>
                  <span className="text-sm text-white bg-blue-600 px-2 py-0.5 rounded">{filteredSellerVouchers.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">
                    {!expandedSections.allSellers ? 'Click to expand' : `Showing ${filteredSellerVouchers.length}`}
                  </span>
                  {expandedSections.allSellers ? (
                    <ChevronUp className="w-5 h-5 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </div>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  !expandedSections.allSellers ? 'max-h-0 opacity-0' : 'max-h-[3000px] opacity-100'
                }`}
              >
                <VoucherTable
                  vouchers={filteredSellerVouchers}
                  isAdmin={false}
                  loading={loading}
                />
              </div>
            </div>
          </>
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
