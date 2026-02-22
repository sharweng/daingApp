/**
 * PayMongo Configuration
 * 
 * IMPORTANT: These are TEST keys - no real money involved!
 * Test cards will work, real cards will be rejected.
 * 
 * Secret key is now stored securely in backend environment variables.
 * Only public key is exposed in frontend (which is safe and required).
 */

export const PAYMONGO_CONFIG = {
  // Public key - safe to use in frontend, required for PayMongo.js and card tokenization
  // This is read from environment variable for security
  publicKey: import.meta.env.VITE_PAYMONGO_PUBLIC_KEY || 'pk_test_JsM6hAfEyDF58ULeova92Jfp',
  
  // PayMongo API URL - for card tokenization (uses public key only, safe)
  paymongoApiUrl: 'https://api.paymongo.com/v1',
  
  // Backend API URL - for payment intents (uses secret key on backend, secure)
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  
  // Test mode indicator
  isTestMode: true,
}

/**
 * PayMongo Test Cards for Testing
 * Use these during checkout - they won't charge real money!
 */
export const TEST_CARDS = {
  success: {
    number: '4343434343434345',
    expiry: '12/28',
    cvv: '123',
    description: 'Always succeeds'
  },
  declined: {
    number: '4571736000000008',
    expiry: '12/28', 
    cvv: '123',
    description: 'Always declined'
  },
  threeDSecure: {
    number: '4120000000000007',
    expiry: '12/28',
    cvv: '123',
    description: 'Requires 3D Secure'
  }
}
