import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, ArrowLeft, Loader, ShoppingCart, Gift, AlertCircle } from 'lucide-react'
import { getCart, type CartItem, validateVoucher } from '../services/api'
import { authService } from '../services/auth.service'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import PageTitleHero from '../components/layout/PageTitleHero'
import { validateRequired, validatePhone, validatePostalCode, validateLength } from '../utils/validation'

interface AddressForm {
  full_name: string
  phone: string
  address_line: string
  city: string
  province: string
  postal_code: string
  notes: string
}

const STORAGE_KEY = 'checkout_address'
const PROFILE_PROMPT_KEY = 'checkout_profile_prompted'
const CHECKOUT_SELLER_KEY = 'checkout_seller_id'
const CHECKOUT_VOUCHER_KEY = 'checkout_voucher'

export default function CheckoutAddressPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [profileIncomplete, setProfileIncomplete] = useState(false)
  const [sellerId, setSellerId] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<AddressForm>({
    full_name: '',
    phone: '',
    address_line: '',
    city: '',
    province: '',
    postal_code: '',
    notes: '',
  })

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null)
  const [voucherError, setVoucherError] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    const storedSellerId = (sessionStorage.getItem(CHECKOUT_SELLER_KEY) || '').trim()
    if (!storedSellerId) {
      showToast('Please choose a seller to checkout from your cart')
      navigate('/cart')
      return
    }
    setSellerId(storedSellerId)

    const loadCart = async () => {
      setLoading(true)
      try {
        const res = await getCart()
        const filtered = (res.items || []).filter((item) => item.product.seller_id === storedSellerId)
        if (filtered.length === 0) {
          showToast('No items found for the selected seller')
          navigate('/cart')
          return
        }
        setCartItems(filtered)
      } catch (err: any) {
        showToast(err?.response?.data?.detail || 'Failed to load cart')
      } finally {
        setLoading(false)
      }
    }
    loadCart()

    const saved = sessionStorage.getItem(STORAGE_KEY)
    const hasSaved = Boolean(saved)
    if (saved) {
      try {
        setForm(JSON.parse(saved))
      } catch {
        // ignore
      }
    }

    const loadProfile = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        const fullName = currentUser.full_name || currentUser.name || ''
        const phone = currentUser.phone || ''
        const addressLine = currentUser.street_address || ''
        const city = currentUser.city || ''
        const province = currentUser.province || ''
        const postalCode = currentUser.postal_code || ''
        const missing = !fullName || !phone || !addressLine || !city || !province

        setProfileIncomplete(missing)

        if (!hasSaved) {
          setForm((prev) => ({
            ...prev,
            full_name: fullName || prev.full_name,
            phone: phone || prev.phone,
            address_line: addressLine || prev.address_line,
            city: city || prev.city,
            province: province || prev.province,
            postal_code: postalCode || prev.postal_code,
          }))
        }

        if (missing) {
          const prompted = sessionStorage.getItem(PROFILE_PROMPT_KEY)
          if (!prompted) {
            sessionStorage.setItem(PROFILE_PROMPT_KEY, '1')
            showToast('Please complete your profile details before placing an order.')
            navigate('/profile')
          }
        } else {
          sessionStorage.removeItem(PROFILE_PROMPT_KEY)
        }
      } catch {
        // ignore
      }
    }
    loadProfile()
  }, [isLoggedIn, navigate, showToast])

  const handleChange = (key: keyof AddressForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    
    // Validate all fields
    const errors: Record<string, string> = {}
    
    const nameValidation = validateRequired(form.full_name, 'Full name')
    if (!nameValidation.valid) errors.full_name = nameValidation.error!
    
    const phoneValidation = validatePhone(form.phone)
    if (!phoneValidation.valid) errors.phone = phoneValidation.error!
    
    const addressValidation = validateLength(form.address_line, 5, 200, 'Street address')
    if (!addressValidation.valid) errors.address_line = addressValidation.error!
    
    const cityValidation = validateRequired(form.city, 'City')
    if (!cityValidation.valid) errors.city = cityValidation.error!
    
    const provinceValidation = validateRequired(form.province, 'Province')
    if (!provinceValidation.valid) errors.province = provinceValidation.error!
    
    const postalValidation = validatePostalCode(form.postal_code)
    if (!postalValidation.valid) errors.postal_code = postalValidation.error!
    
    if (form.notes.trim() && form.notes.trim().length > 500) {
      errors.notes = 'Notes must not exceed 500 characters'
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      showToast('Please fix the errors in the form')
      return
    }
    
    if (profileIncomplete) {
      showToast('Please update your profile details before continuing.')
      navigate('/profile')
      return
    }
    if (cartItems.length === 0) {
      showToast('Your cart is empty')
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    navigate('/checkout/payment')
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0)

  // Load saved voucher on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(CHECKOUT_VOUCHER_KEY)
    if (saved) {
      try {
        setAppliedVoucher(JSON.parse(saved))
      } catch (e) {
        // ignore
      }
    }
  }, [])

  // Handle voucher application
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Please enter a code')
      return
    }

    setVoucherLoading(true)
    setVoucherError('')

    try {
      const result = await validateVoucher(voucherCode.toUpperCase(), subtotal)
      setAppliedVoucher(result)
      sessionStorage.setItem(CHECKOUT_VOUCHER_KEY, JSON.stringify(result))
      showToast(`Voucher applied! Saving ₱${result.discount_value.toLocaleString()}`)
      setVoucherCode('')
    } catch (err: any) {
      setVoucherError(err.response?.data?.detail || 'Invalid voucher code')
    } finally {
      setVoucherLoading(false)
    }
  }

  // Handle remove voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null)
    sessionStorage.removeItem(CHECKOUT_VOUCHER_KEY)
    setVoucherCode('')
    setVoucherError('')
  }

  const discount = appliedVoucher?.discount_value || 0
  const total = Math.max(0, subtotal - discount)

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading checkout...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-6">
      <PageTitleHero
        title="Shipping Address"
        subtitle="Set your delivery details before payment"
        backgroundImage="/assets/daing/danggit/slide1.jfif"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Checkout Steps */}
        <div className="mb-8">
          <div className="flex items-center gap-4 justify-center">
            {/* Step 1 - Cart */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm mb-2">
                1
              </div>
              <span className="text-xs font-medium text-slate-700">Cart</span>
            </div>

            {/* Divider */}
            <div className="flex-1 h-0.5 bg-blue-200 max-w-xs mx-2" />

            {/* Step 2 - Address */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm mb-2">
                2
              </div>
              <span className="text-xs font-medium text-slate-700">Address</span>
            </div>

            {/* Divider */}
            <div className="flex-1 h-0.5 bg-slate-300 max-w-xs mx-2" />

            {/* Step 3 - Payment */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm mb-2">
                3
              </div>
              <span className="text-xs font-medium text-slate-600">Payment</span>
            </div>
          </div>
        </div>

        <Link
          to="/cart"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Delivery Address</h2>
            </div>

            {profileIncomplete && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Please complete your profile details first. After updating your profile, return here and the form will be
                auto-filled (you can still edit it for a different delivery location).
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Full Name</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    required
                    className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-1 ${
                      formErrors.full_name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {formErrors.full_name && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.full_name}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                    className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-1 ${
                      formErrors.phone ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Street Address</label>
                <input
                  value={form.address_line}
                  onChange={(e) => handleChange('address_line', e.target.value)}
                  required
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-1 ${
                    formErrors.address_line ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {formErrors.address_line && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.address_line}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    required
                    className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-1 ${
                      formErrors.city ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {formErrors.city && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.city}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Province</label>
                  <input
                    value={form.province}
                    onChange={(e) => handleChange('province', e.target.value)}
                    required
                    className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-1 ${
                      formErrors.province ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {formErrors.province && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.province}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Postal Code</label>
                  <input
                    value={form.postal_code}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                    required
                    className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-1 ${
                      formErrors.postal_code ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {formErrors.postal_code && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.postal_code}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Notes (Optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-1 ${
                    formErrors.notes ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {formErrors.notes && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.notes}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Continue to Payment
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 h-fit">
            <h3 className="font-semibold text-slate-900 mb-4">Order Summary</h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Items</span>
              <span className="text-slate-900">{cartItems.length}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-900">₱{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Delivery</span>
              <span className="text-green-600">Free</span>
            </div>

            {/* Voucher Section */}
            <div className="my-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-semibold text-slate-700 uppercase">Discount Code</label>
              </div>

              {!appliedVoucher ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase())
                      setVoucherError('')
                    }}
                    className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
                      voucherError
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  <button
                    onClick={handleApplyVoucher}
                    disabled={voucherLoading || !voucherCode.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {voucherLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">{appliedVoucher.voucher_id}</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Saving ₱{appliedVoucher.discount_value.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveVoucher}
                    className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {voucherError && (
                <div className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{voucherError}</span>
                </div>
              )}
            </div>

            {/* Total with Discount */}
            {appliedVoucher && (
              <div className="flex justify-between text-sm mb-2 pt-2 border-t border-slate-200">
                <span className="text-slate-600">Discount</span>
                <span className="text-green-600 font-semibold">-₱{appliedVoucher.discount_value.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-4">
              <span>Total</span>
              <span>₱{total.toLocaleString()}</span>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Your order will be processed after payment confirmation.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
