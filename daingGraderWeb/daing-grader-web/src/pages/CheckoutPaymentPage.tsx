import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CreditCard, ArrowLeft, Loader, CheckCircle, Wallet, AlertCircle, Info } from 'lucide-react'
import { createOrder, getCart, type CartItem } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import PageTitleHero from '../components/layout/PageTitleHero'
import { processCardPayment, formatCardNumber, validateCardNumber, getCardType } from '../services/paymongo'
import { PAYMONGO_CONFIG, TEST_CARDS } from '../config/paymongo'

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
const CHECKOUT_SELLER_KEY = 'checkout_seller_id'
const CHECKOUT_EMAIL_STATUS_KEY = 'checkout_email_status'

export default function CheckoutPaymentPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [address, setAddress] = useState<AddressForm | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [sellerId, setSellerId] = useState('')

  // Card payment state
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardErrors, setCardErrors] = useState<{[key: string]: string}>({})
  const [showTestCards, setShowTestCards] = useState(false)

  // E-Wallet payment state
  const [ewalletProvider, setEwalletProvider] = useState<'gcash' | 'grabpay' | 'maya'>('gcash')
  const [ewalletPhone, setEwalletPhone] = useState('')
  const [ewalletErrors, setEwalletErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) {
      navigate('/checkout/address')
      return
    }

    const storedSellerId = (sessionStorage.getItem(CHECKOUT_SELLER_KEY) || '').trim()
    if (!storedSellerId) {
      showToast('Please choose a seller to checkout from your cart')
      navigate('/cart')
      return
    }
    setSellerId(storedSellerId)

    try {
      setAddress(JSON.parse(saved))
    } catch {
      navigate('/checkout/address')
      return
    }

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
  }, [isLoggedIn, navigate])

  // Card input handlers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardNumber(formatted)
    if (cardErrors.cardNumber) {
      setCardErrors({ ...cardErrors, cardNumber: '' })
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4)
    }
    setCardExpiry(value.slice(0, 5))
    if (cardErrors.expiry) {
      setCardErrors({ ...cardErrors, expiry: '' })
    }
  }

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setCardCvc(value)
    if (cardErrors.cvc) {
      setCardErrors({ ...cardErrors, cvc: '' })
    }
  }

  const handleUseTestCard = (cardType: 'success' | 'declined' | 'threeDSecure') => {
    const card = TEST_CARDS[cardType]
    setCardNumber(formatCardNumber(card.number))
    setCardExpiry(card.expiry)
    setCardCvc(card.cvv)
    setCardName('Test User')
    setShowTestCards(false)
    showToast(`Test card loaded: ${card.description}`)
  }

  const validateCardForm = (): boolean => {
    const errors: {[key: string]: string} = {}

    if (!cardNumber || !validateCardNumber(cardNumber)) {
      errors.cardNumber = 'Invalid card number'
    }

    const [month, year] = cardExpiry.split('/')
    if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
      errors.expiry = 'Invalid expiry date'
    }

    if (!cardCvc || cardCvc.length < 3) {
      errors.cvc = 'Invalid CVC'
    }

    if (!cardName.trim()) {
      errors.cardName = 'Card holder name is required'
    }

    setCardErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEwalletForm = (): boolean => {
    const errors: {[key: string]: string} = {}

    // Validate Philippine phone number
    const phoneRegex = /^(09|\+639)\d{9}$/
    const cleanPhone = ewalletPhone.replace(/\s/g, '')
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      errors.phone = 'Invalid Philippine phone number (09XXXXXXXXX)'
    }

    setEwalletErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    // Format as 09XX XXX XXXX
    if (value.length > 0) {
      if (!value.startsWith('0')) value = '0' + value
      value = value.slice(0, 11)
      if (value.length > 2) {
        value = value.slice(0, 4) + ' ' + value.slice(4, 7) + ' ' + value.slice(7)
      }
    }
    setEwalletPhone(value)
    if (ewalletErrors.phone) {
      setEwalletErrors({ ...ewalletErrors, phone: '' })
    }
  }

  const handleConfirmOrder = async () => {
    if (!address) return
    if (cartItems.length === 0) {
      showToast('Your cart is empty')
      return
    }

    // Validate card details if paying with card
    if (paymentMethod === 'card') {
      if (!validateCardForm()) {
        showToast('Please fill in all card details correctly')
        return
      }
    }

    // Validate e-wallet details if paying with e-wallet
    if (paymentMethod === 'paymongo') {
      if (!validateEwalletForm()) {
        showToast('Please enter a valid Philippine phone number')
        return
      }
    }

    setSubmitting(true)
    try {
      // For PayMongo payments (e-wallet and card), create order which will generate payment intent
      if (paymentMethod === 'paymongo') {
        showToast('Creating order and initializing payment...')
        
        // Call checkout which will create orders and payment intent
        const checkoutRes = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/orders/checkout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
            body: JSON.stringify({
              address: address,
              payment_method: 'paymongo',
              seller_id: sellerId || null,
            }),
          }
        )

        if (!checkoutRes.ok) {
          const error = await checkoutRes.json()
          throw new Error(error.detail || 'Failed to create order')
        }

        const checkoutData = await checkoutRes.json()
        
        // If checkout_url exists, we need to redirect to PayMongo
        if (checkoutData.checkout_url) {
          // Don't clear cart/session yet - user might cancel payment
          showToast('Redirecting to payment processor...')
          setTimeout(() => {
            window.location.href = checkoutData.checkout_url
          }, 1000)
          return
        } else {
          throw new Error('No checkout URL received from payment processor')
        }
      }

      // For card payments, process locally first then create order
      if (paymentMethod === 'card') {
        showToast('Processing card payment...')
        
        const [expMonth, expYear] = cardExpiry.split('/')
        const fullYear = '20' + expYear

        const paymentResult = await processCardPayment(
          {
            number: cardNumber.replace(/\s/g, ''),
            expMonth: expMonth,
            expYear: fullYear,
            cvc: cardCvc,
          },
          subtotal,
          `DaingGrader Order - ${cartItems.length} item(s)`
        )

        if (!paymentResult.success) {
          throw new Error('Payment was declined. Please try another card.')
        }

        showToast('Payment successful! Creating order...')
      }

      // Create the order (for COD and card payments)
      const res = await createOrder({ address, payment_method: paymentMethod, seller_id: sellerId })
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(CHECKOUT_SELLER_KEY)
      if (res.email_status) {
        sessionStorage.setItem(CHECKOUT_EMAIL_STATUS_KEY, JSON.stringify(res.email_status))
      } else {
        sessionStorage.removeItem(CHECKOUT_EMAIL_STATUS_KEY)
      }
      const orderIds =
        res.order_ids?.length ? res.order_ids : res.orders?.map((order) => order.id) || (res.order?.id ? [res.order.id] : [])
      if (orderIds.length > 0) {
        const params = new URLSearchParams({ ids: orderIds.join(',') })
        navigate(`/order-confirmed?${params.toString()}`)
      } else {
        navigate('/order-confirmed')
      }
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0)

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-6">
      <PageTitleHero
        title="Payment"
        subtitle="Confirm your payment method and place the order"
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
            <div className="flex-1 h-0.5 bg-blue-200 max-w-xs mx-2" />

            {/* Step 3 - Payment */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm mb-2">
                3
              </div>
              <span className="text-xs font-medium text-slate-700">Payment</span>
            </div>
          </div>
        </div>

        <Link
          to="/checkout/address"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Address
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Test Mode Banner */}
            {PAYMONGO_CONFIG.isTestMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-900 font-semibold text-sm">Test Mode Active</p>
                  <p className="text-amber-700 text-sm mt-1">
                    Using PayMongo test environment. No real money will be charged.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Payment Method</h2>
              </div>

              <div className="space-y-3">
                {/* Cash on Delivery */}
                <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'cod' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="text-slate-700 font-medium">Cash on Delivery</span>
                    <p className="text-xs text-slate-500 mt-1">Pay when you receive your order</p>
                  </div>
                </label>

                {/* PayMongo e-Wallet */}
                <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'paymongo' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="paymongo"
                    checked={paymentMethod === 'paymongo'}
                    onChange={() => setPaymentMethod('paymongo')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <span className="text-slate-700 font-medium">PayMongo e-Wallet</span>
                    <p className="text-xs text-slate-500 mt-1">GCash, GrabPay, Maya (via PayMongo)</p>
                  </div>
                </label>

                {/* Credit/Debit Card */}
                <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <span className="text-slate-700 font-medium">Credit / Debit Card</span>
                    <p className="text-xs text-slate-500 mt-1">Visa, Mastercard, JCB (via PayMongo)</p>
                  </div>
                </label>
              </div>

              {/* E-Wallet Input Fields */}
              {paymentMethod === 'paymongo' && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4">E-Wallet Details</h3>

                  <div className="space-y-4">
                    {/* Provider Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select Provider
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['gcash', 'grabpay', 'maya'] as const).map((provider) => (
                          <button
                            key={provider}
                            type="button"
                            onClick={() => setEwalletProvider(provider)}
                            className={`py-2 px-3 rounded-lg font-medium text-sm transition-all capitalize ${
                              ewalletProvider === provider
                                ? 'bg-blue-600 text-white border-2 border-blue-600'
                                : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-300'
                            }`}
                          >
                            {provider === 'gcash' && '💳 GCash'}
                            {provider === 'grabpay' && '🚕 GrabPay'}
                            {provider === 'maya' && '💰 Maya'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Philippine Mobile Number
                      </label>
                      <input
                        type="text"
                        value={ewalletPhone}
                        onChange={handlePhoneChange}
                        placeholder="09XX XXX XXXX"
                        maxLength={13}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          ewalletErrors.phone
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                      />
                      {ewalletErrors.phone && (
                        <p className="text-xs text-red-600 mt-1">{ewalletErrors.phone}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        ℹ️ A payment prompt will be sent to this number
                      </p>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        When you confirm, you'll be redirected to {ewalletProvider === 'gcash' ? 'GCash' : ewalletProvider === 'grabpay' ? 'GrabPay' : 'Maya'} to complete the payment.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Input Fields */}
              {paymentMethod === 'card' && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center justify-between">
                    <span>Card Details</span>
                    {PAYMONGO_CONFIG.isTestMode && (
                      <button
                        type="button"
                        onClick={() => setShowTestCards(!showTestCards)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-normal"
                      >
                        {showTestCards ? 'Hide' : 'Show'} Test Cards
                      </button>
                    )}
                  </h3>

                  {/* Test Cards */}
                  {showTestCards && PAYMONGO_CONFIG.isTestMode && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-semibold text-blue-900 mb-2">Test Cards (Click to use):</p>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleUseTestCard('success')}
                          className="block w-full text-left text-xs px-2 py-1 hover:bg-blue-100 rounded"
                        >
                          <span className="font-mono text-blue-700">4343 4343 4343 4345</span>
                          <span className="text-slate-600 ml-2">- Payment successful</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseTestCard('declined')}
                          className="block w-full text-left text-xs px-2 py-1 hover:bg-blue-100 rounded"
                        >
                          <span className="font-mono text-blue-700">4571 7360 0000 0008</span>
                          <span className="text-slate-600 ml-2">- Payment declined</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Card Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          cardErrors.cardNumber
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                      />
                      {cardErrors.cardNumber && (
                        <p className="text-xs text-red-600 mt-1">{cardErrors.cardNumber}</p>
                      )}
                      {cardNumber && !cardErrors.cardNumber && (
                        <p className="text-xs text-slate-500 mt-1 capitalize">
                          {getCardType(cardNumber)} card detected
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Expiry Date */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            cardErrors.expiry
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-slate-300 focus:ring-blue-500'
                          }`}
                        />
                        {cardErrors.expiry && (
                          <p className="text-xs text-red-600 mt-1">{cardErrors.expiry}</p>
                        )}
                      </div>

                      {/* CVC */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          CVC
                        </label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={handleCvcChange}
                          placeholder="123"
                          maxLength={4}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            cardErrors.cvc
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-slate-300 focus:ring-blue-500'
                          }`}
                        />
                        {cardErrors.cvc && (
                          <p className="text-xs text-red-600 mt-1">{cardErrors.cvc}</p>
                        )}
                      </div>
                    </div>

                    {/* Card Holder Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Card Holder Name
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => {
                          setCardName(e.target.value)
                          if (cardErrors.cardName) {
                            setCardErrors({ ...cardErrors, cardName: '' })
                          }
                        }}
                        placeholder="JOHN DOE"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 uppercase ${
                          cardErrors.cardName
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                      />
                      {cardErrors.cardName && (
                        <p className="text-xs text-red-600 mt-1">{cardErrors.cardName}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Your payment is secured by PayMongo. Card details are encrypted and never stored on our servers.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmOrder}
                disabled={submitting}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {paymentMethod === 'cod' ? 'Placing order...' : 'Processing payment...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {paymentMethod === 'cod' ? 'Confirm Order' : 'Pay & Confirm Order'}
                  </>
                )}
              </button>
            </div>
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
            <div className="flex justify-between text-sm mb-4">
              <span className="text-slate-600">Delivery</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-4">
              <span>Total</span>
              <span>₱{subtotal.toLocaleString()}</span>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              By placing your order, you agree to our terms and policies.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
