/**
 * PayMongo API Service
 * Handles payment processing with PayMongo
 */

import { PAYMONGO_CONFIG } from '../config/paymongo'

export interface CardDetails {
  number: string
  expMonth: string
  expYear: string
  cvc: string
}

export interface PayMongoPaymentMethod {
  id: string
  type: string
  attributes: {
    type: string
    details: any
  }
}

export interface PayMongoPaymentIntent {
  id: string
  attributes: {
    amount: number
    currency: string
    status: string
    payment_method_allowed: string[]
  }
}

/**
 * Create a PayMongo Payment Method (Tokenize card)
 */
export async function createPaymentMethod(cardDetails: CardDetails): Promise<PayMongoPaymentMethod> {
  const { number, expMonth, expYear, cvc } = cardDetails

  const payload = {
    data: {
      attributes: {
        type: 'card',
        details: {
          card_number: number.replace(/\s/g, ''),
          exp_month: parseInt(expMonth),
          exp_year: parseInt(expYear),
          cvc: cvc,
        },
      },
    },
  }

  try {
    const response = await fetch(`${PAYMONGO_CONFIG.paymongoApiUrl}/payment_methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(PAYMONGO_CONFIG.publicKey)}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errors?.[0]?.detail || 'Failed to create payment method')
    }

    const data = await response.json()
    return data.data
  } catch (error: any) {
    throw new Error(error.message || 'Payment processing failed')
  }
}

/**
 * Create a PayMongo Payment Intent
 * Now calls our backend API which securely handles the secret key
 */
export async function createPaymentIntent(amount: number, description: string): Promise<PayMongoPaymentIntent> {
  // PayMongo expects amount in centavos (multiply by 100)
  const amountInCentavos = Math.round(amount * 100)

  try {
    // Call our backend API instead of PayMongo directly
    const response = await fetch(`${PAYMONGO_CONFIG.apiUrl}/api/payment/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        amount: amountInCentavos,
        description: description,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || error.error || 'Failed to create payment intent')
    }

    const data = await response.json()
    return {
      id: data.payment_intent_id || data.client_key,
      attributes: {
        amount: amountInCentavos,
        currency: 'PHP',
        status: 'awaiting_payment_method',
        payment_method_allowed: ['card'],
      }
    }
  } catch (error: any) {
    throw new Error(error.message || 'Payment intent creation failed')
  }
}

/**
 * Attach Payment Method to Payment Intent
 * Now calls our backend API which securely handles the secret key
 */
export async function attachPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<PayMongoPaymentIntent> {
  try {
    const response = await fetch(`${PAYMONGO_CONFIG.apiUrl}/api/payment/attach-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId,
        return_url: `${window.location.origin}/order-confirmed`,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || error.error || 'Failed to attach payment method')
    }

    const data = await response.json()
    return {
      id: data.payment_intent_id,
      attributes: {
        amount: data.amount || 0,
        currency: 'PHP',
        status: data.status || 'processing',
        payment_method_allowed: ['card'],
      }
    }
  } catch (error: any) {
    throw new Error(error.message || 'Payment attachment failed')
  }
}

/**
 * Process complete card payment
 */
export async function processCardPayment(
  cardDetails: CardDetails,
  amount: number,
  description: string
): Promise<{ success: boolean; paymentIntentId: string; status: string }> {
  try {
    // Step 1: Create payment method (tokenize card)
    const paymentMethod = await createPaymentMethod(cardDetails)

    // Step 2: Create payment intent
    const paymentIntent = await createPaymentIntent(amount, description)

    // Step 3: Attach payment method to intent
    const result = await attachPaymentIntent(paymentIntent.id, paymentMethod.id)

    return {
      success: result.attributes.status === 'succeeded' || result.attributes.status === 'processing',
      paymentIntentId: result.id,
      status: result.attributes.status,
    }
  } catch (error: any) {
    throw error
  }
}

/**
 * Validate card number (Luhn algorithm)
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '')
  if (!/^\d{13,19}$/.test(cleaned)) return false

  let sum = 0
  let isEven = false

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i])

    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Format card number with spaces
 */
export function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\s/g, '')
  const chunks = cleaned.match(/.{1,4}/g) || []
  return chunks.join(' ').substring(0, 19) // Max 16 digits + 3 spaces
}

/**
 * Get card type from number
 */
export function getCardType(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '')

  if (/^4/.test(cleaned)) return 'visa'
  if (/^5[1-5]/.test(cleaned)) return 'mastercard'
  if (/^3[47]/.test(cleaned)) return 'amex'
  if (/^6(?:011|5)/.test(cleaned)) return 'discover'
  if (/^35/.test(cleaned)) return 'jcb'

  return 'unknown'
}
