import React, { useState, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { createVoucher, updateVoucher } from '../../services/api'

interface CreateVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingVoucher?: {
    _id: string
    code: string
    discount_type: 'fixed' | 'percentage'
    value: number
    expiration_date?: string
    max_uses?: number
    per_user_limit?: number
    min_order_amount?: number
    active: boolean
  } | null
}

export default function CreateVoucherModal({
  isOpen,
  onClose,
  onSuccess,
  editingVoucher,
}: CreateVoucherModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'fixed' | 'percentage',
    value: 0,
    use_expiration: false,
    expiration_date: '',
    use_max_uses: false,
    max_uses: '',
    use_per_user: false,
    per_user_limit: '',
    use_min_order: false,
    min_order_amount: '',
  })

  // Pre-fill if editing
  useEffect(() => {
    if (editingVoucher) {
      setFormData({
        code: editingVoucher.code,
        discount_type: editingVoucher.discount_type,
        value: editingVoucher.value,
        use_expiration: !!editingVoucher.expiration_date,
        expiration_date: editingVoucher.expiration_date
          ? editingVoucher.expiration_date.split('T')[0]
          : '',
        use_max_uses: !!editingVoucher.max_uses,
        max_uses: editingVoucher.max_uses?.toString() || '',
        use_per_user: !!editingVoucher.per_user_limit,
        per_user_limit: editingVoucher.per_user_limit?.toString() || '',
        use_min_order: !!editingVoucher.min_order_amount,
        min_order_amount: editingVoucher.min_order_amount?.toString() || '',
      })
    } else {
      setFormData({
        code: '',
        discount_type: 'percentage',
        value: 0,
        use_expiration: false,
        expiration_date: '',
        use_max_uses: false,
        max_uses: '',
        use_per_user: false,
        per_user_limit: '',
        use_min_order: false,
        min_order_amount: '',
      })
    }
    setError('')
    setSuccess('')
  }, [editingVoucher, isOpen])

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const validateForm = (): string | null => {
    if (!formData.code.trim()) return 'Code is required'
    if (formData.code.length < 3 || formData.code.length > 20)
      return 'Code must be 3-20 characters'
    if (!/^[A-Za-z0-9_-]+$/.test(formData.code))
      return 'Code must be alphanumeric, dash, or underscore only'

    if (formData.value <= 0) return 'Discount value must be greater than 0'
    if (formData.discount_type === 'percentage' && formData.value > 100)
      return 'Percentage cannot exceed 100%'

    if (formData.use_expiration && !formData.expiration_date)
      return 'Expiration date is required'
    if (formData.use_expiration && new Date(formData.expiration_date) <= new Date())
      return 'Expiration date must be in the future'

    if (formData.use_max_uses && !formData.max_uses)
      return 'Max uses is required'
    if (formData.use_max_uses && parseInt(formData.max_uses) <= 0)
      return 'Max uses must be greater than 0'

    if (formData.use_per_user && !formData.per_user_limit)
      return 'Per user limit is required'
    if (formData.use_per_user && parseInt(formData.per_user_limit) <= 0)
      return 'Per user limit must be greater than 0'

    if (formData.use_min_order && !formData.min_order_amount)
      return 'Minimum order amount is required'
    if (formData.use_min_order && parseFloat(formData.min_order_amount) <= 0)
      return 'Minimum order amount must be greater than 0'

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        code: formData.code,
        discount_type: formData.discount_type,
        value: parseFloat(formData.value.toString()),
        expiration_date: formData.use_expiration ? formData.expiration_date : null,
        max_uses: formData.use_max_uses ? parseInt(formData.max_uses) : null,
        per_user_limit: formData.use_per_user ? parseInt(formData.per_user_limit) : null,
        min_order_amount: formData.use_min_order ? parseFloat(formData.min_order_amount) : null,
      }

      if (editingVoucher) {
        await updateVoucher(editingVoucher._id, payload)
        setSuccess('Voucher updated successfully!')
      } else {
        await createVoucher(payload)
        setSuccess('Voucher created successfully!')
      }

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save voucher')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <h2 className="text-white text-xl font-bold">
            {editingVoucher ? 'Edit Discount Code' : 'Create Discount Code'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-600">{success}</p>
            </div>
          )}

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              placeholder="e.g., DAING20OFF"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!!editingVoucher}
            />
            <p className="text-xs text-slate-500 mt-1">3-20 characters, alphanumeric only</p>
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                name="discount_type"
                value={formData.discount_type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Value <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  name="value"
                  value={formData.value || ''}
                  onChange={handleInputChange}
                  placeholder="0"
                  step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                  min="0"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="ml-2 text-slate-600 font-medium">
                  {formData.discount_type === 'percentage' ? '%' : '₱'}
                </span>
              </div>
            </div>
          </div>

          {/* Optional Constraints */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Optional Constraints</h3>

            {/* Expiration Date */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="use_expiration"
                  checked={formData.use_expiration}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Set Expiration Date</span>
              </label>
              {formData.use_expiration && (
                <input
                  type="date"
                  name="expiration_date"
                  value={formData.expiration_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ml-7"
                />
              )}
            </div>

            {/* Max Total Uses */}
            <div className="space-y-3 mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="use_max_uses"
                  checked={formData.use_max_uses}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Set Max Total Uses</span>
              </label>
              {formData.use_max_uses && (
                <input
                  type="number"
                  name="max_uses"
                  value={formData.max_uses}
                  onChange={handleInputChange}
                  placeholder="100"
                  min="1"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ml-7"
                />
              )}
            </div>

            {/* Per User Limit */}
            <div className="space-y-3 mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="use_per_user"
                  checked={formData.use_per_user}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Set Per User Limit</span>
              </label>
              {formData.use_per_user && (
                <input
                  type="number"
                  name="per_user_limit"
                  value={formData.per_user_limit}
                  onChange={handleInputChange}
                  placeholder="2"
                  min="1"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ml-7"
                />
              )}
            </div>

            {/* Min Order Amount */}
            <div className="space-y-3 mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="use_min_order"
                  checked={formData.use_min_order}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Set Min Order Amount</span>
              </label>
              {formData.use_min_order && (
                <div className="flex items-center ml-7">
                  <span className="text-slate-600 mr-2">₱</span>
                  <input
                    type="number"
                    name="min_order_amount"
                    value={formData.min_order_amount}
                    onChange={handleInputChange}
                    placeholder="1000"
                    step="0.01"
                    min="0"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editingVoucher ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
