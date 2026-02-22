/**
 * Comprehensive validation utilities and regex patterns
 * For community posts, comments, reviews, and forms
 */

// ==================== REGEX PATTERNS ====================

/**
 * Text content validation - allows letters, numbers, spaces, and common punctuation
 * Blocks special characters that could be used for XSS or injection attacks
 */
export const SAFE_TEXT_REGEX = /^[A-Za-z0-9\s.,!?'"\-()&:;]+$/

/**
 * Alphanumeric with basic punctuation - stricter than SAFE_TEXT
 */
export const ALPHANUMERIC_PUNCTUATION = /^[A-Za-z0-9\s.,!?'"\-]+$/

/**
 * Title validation - alphanumeric with spaces and basic punctuation
 */
export const TITLE_REGEX = /^[A-Za-z0-9\s.,!?'"\-()&:]+$/

/**
 * Comment/Review validation - allows more punctuation for natural language
 */
export const COMMENT_REGEX = /^[A-Za-z0-9\s.,!?'"\-()&:;\n]+$/

/**
 * Email validation (RFC 5322 simplified)
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * Phone number validation (flexible format)
 */
export const PHONE_REGEX = /^[\d\s\-()++]+$/

/**
 * Postal code validation (alphanumeric with spaces/dashes)
 */
export const POSTAL_CODE_REGEX = /^[A-Za-z0-9\s\-]+$/

/**
 * URL validation
 */
export const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/

/**
 * Price/Number validation (decimal)
 */
export const PRICE_REGEX = /^\d+(\.\d{1,2})?$/

/**
 * Username validation (alphanumeric, underscore, hyphen)
 */
export const USERNAME_REGEX = /^[A-Za-z0-9_-]+$/

/**
 * No HTML tags allowed
 */
export const NO_HTML_REGEX = /^[^<>]*$/

/**
 * Check for suspicious patterns (SQL injection, XSS attempts)
 */
export const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /<iframe/i,
  /javascript:/i,
  /on\w+\s*=/i, // event handlers like onclick=
  /\bselect\b.*\bfrom\b/i,
  /\bunion\b.*\bselect\b/i,
  /\binsert\b.*\binto\b/i,
  /\bdelete\b.*\bfrom\b/i,
  /\bdrop\b.*\btable\b/i,
  /\bexec\b.*\(/i,
]

/**
 * Bad words list - these will be censored with ****
 * Add more words as needed
 */
export const BAD_WORDS = [
  'fuck',
  'shit',
  'ass',
  'bitch',
  'damn',
  'hell',
  'bastard',
  'crap',
  'piss',
  'dick',
  'pussy',
  'cock',
  'asshole',
  'motherfucker',
  'bullshit',
  'whore',
  'slut',
  'fag',
  'nigger',
  'retard',
  'idiot',
  'stupid',
  'dumbass',
  // Filipino bad words
  'putang',
  'puta',
  'gago',
  'tangina',
  'bobo',
  'ulol',
  'tarantado',
  'leche',
  'pakyu',
]

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate post title
 */
export function validatePostTitle(title: string): { valid: boolean; error?: string } {
  const trimmed = title.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Title is required' }
  }
  
  if (trimmed.length < 5) {
    return { valid: false, error: 'Title must be at least 5 characters' }
  }
  
  if (trimmed.length > 200) {
    return { valid: false, error: 'Title must not exceed 200 characters' }
  }
  
  if (!TITLE_REGEX.test(trimmed)) {
    return { valid: false, error: 'Title contains invalid characters. Use only letters, numbers, and basic punctuation.' }
  }
  
  if (!NO_HTML_REGEX.test(trimmed)) {
    return { valid: false, error: 'HTML tags are not allowed' }
  }
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Content contains suspicious patterns' }
    }
  }
  
  return { valid: true }
}

/**
 * Validate post description/content
 */
export function validatePostDescription(description: string): { valid: boolean; error?: string } {
  const trimmed = description.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Description is required' }
  }
  
  if (trimmed.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters' }
  }
  
  if (trimmed.length > 5000) {
    return { valid: false, error: 'Description must not exceed 5000 characters' }
  }
  
  if (!SAFE_TEXT_REGEX.test(trimmed)) {
    return { valid: false, error: 'Description contains invalid characters. Use only letters, numbers, and basic punctuation.' }
  }
  
  if (!NO_HTML_REGEX.test(trimmed)) {
    return { valid: false, error: 'HTML tags are not allowed' }
  }
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Content contains suspicious patterns' }
    }
  }
  
  return { valid: true }
}

/**
 * Validate comment
 */
export function validateComment(comment: string): { valid: boolean; error?: string } {
  const trimmed = comment.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Comment cannot be empty' }
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Comment must be at least 2 characters' }
  }
  
  if (trimmed.length > 1000) {
    return { valid: false, error: 'Comment must not exceed 1000 characters' }
  }
  
  if (!COMMENT_REGEX.test(trimmed)) {
    return { valid: false, error: 'Comment contains invalid characters. Use only letters, numbers, and basic punctuation.' }
  }
  
  if (!NO_HTML_REGEX.test(trimmed)) {
    return { valid: false, error: 'HTML tags are not allowed' }
  }
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Content contains suspicious patterns' }
    }
  }
  
  return { valid: true }
}

/**
 * Validate product review
 */
export function validateReview(rating: number, comment: string): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  // Validate rating
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    errors.rating = 'Rating must be between 1 and 5'
  }
  
  // Validate comment
  const trimmed = comment.trim()
  
  if (!trimmed) {
    errors.comment = 'Review comment is required'
  } else if (trimmed.length < 10) {
    errors.comment = 'Review must be at least 10 characters'
  } else if (trimmed.length > 1000) {
    errors.comment = 'Review must not exceed 1000 characters'
  } else if (!COMMENT_REGEX.test(trimmed)) {
    errors.comment = 'Review contains invalid characters. Use only letters, numbers, and basic punctuation.'
  } else if (!NO_HTML_REGEX.test(trimmed)) {
    errors.comment = 'HTML tags are not allowed'
  } else {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        errors.comment = 'Content contains suspicious patterns'
        break
      }
    }
  }
  
  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Validate email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Email is required' }
  }
  
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' }
  }
  
  return { valid: true }
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const trimmed = phone.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Phone number is required' }
  }
  
  // Remove all non-digit characters for length check
  const digitsOnly = trimmed.replace(/\D/g, '')
  
  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Phone number must have at least 10 digits' }
  }
  
  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number is too long' }
  }
  
  if (!PHONE_REGEX.test(trimmed)) {
    return { valid: false, error: 'Phone number contains invalid characters' }
  }
  
  return { valid: true }
}

/**
 * Validate postal code
 */
export function validatePostalCode(postalCode: string): { valid: boolean; error?: string } {
  const trimmed = postalCode.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Postal code is required' }
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Postal code is too short' }
  }
  
  if (trimmed.length > 10) {
    return { valid: false, error: 'Postal code is too long' }
  }
  
  if (!POSTAL_CODE_REGEX.test(trimmed)) {
    return { valid: false, error: 'Postal code contains invalid characters' }
  }
  
  return { valid: true }
}

/**
 * Validate name (for user names, product names, etc.)
 */
export function validateName(name: string, fieldName = 'Name'): { valid: boolean; error?: string } {
  const trimmed = name.trim()
  
  if (!trimmed) {
    return { valid: false, error: `${fieldName} is required` }
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: `${fieldName} must not exceed 100 characters` }
  }
  
  if (!SAFE_TEXT_REGEX.test(trimmed)) {
    return { valid: false, error: `${fieldName} contains invalid characters` }
  }
  
  return { valid: true }
}

/**
 * Validate price
 */
export function validatePrice(price: string | number): { valid: boolean; error?: string } {
  const priceStr = typeof price === 'number' ? price.toString() : price.trim()
  
  if (!priceStr) {
    return { valid: false, error: 'Price is required' }
  }
  
  if (!PRICE_REGEX.test(priceStr)) {
    return { valid: false, error: 'Invalid price format. Use numbers with up to 2 decimal places.' }
  }
  
  const priceNum = parseFloat(priceStr)
  
  if (priceNum <= 0) {
    return { valid: false, error: 'Price must be greater than 0' }
  }
  
  if (priceNum > 1000000) {
    return { valid: false, error: 'Price is too high' }
  }
  
  return { valid: true }
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName = 'Field'): { valid: boolean; error?: string } {
  const trimmed = value.trim()
  
  if (!trimmed) {
    return { valid: false, error: `${fieldName} is required` }
  }
  
  return { valid: true }
}

/**
 * Validate text length
 */
export function validateLength(
  text: string,
  min: number,
  max: number,
  fieldName = 'Field'
): { valid: boolean; error?: string } {
  const trimmed = text.trim()
  
  if (trimmed.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` }
  }
  
  if (trimmed.length > max) {
    return { valid: false, error: `${fieldName} must not exceed ${max} characters` }
  }
  
  return { valid: true }
}

/**
 * Sanitize text by removing dangerous content
 * Note: Backend should also sanitize, this is just front-end protection
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
}

/**
 * Censor bad words in text by replacing them with ****
 */
export function censorBadWords(text: string): string {
  let censored = text
  
  BAD_WORDS.forEach(badWord => {
    // Create regex to match the bad word (case insensitive, whole word)
    const regex = new RegExp(`\\b${badWord}\\b`, 'gi')
    censored = censored.replace(regex, '****')
  })
  
  return censored
}

/**
 * Check if text contains bad words
 */
export function containsBadWords(text: string): boolean {
  const lowerText = text.toLowerCase()
  return BAD_WORDS.some(badWord => {
    const regex = new RegExp(`\\b${badWord}\\b`, 'i')
    return regex.test(lowerText)
  })
}

/**
 * Validate product name
 */
export function validateProductName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Product name is required' }
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Product name must be at least 3 characters' }
  }
  
  if (trimmed.length > 200) {
    return { valid: false, error: 'Product name must not exceed 200 characters' }
  }
  
  if (!SAFE_TEXT_REGEX.test(trimmed)) {
    return { valid: false, error: 'Product name contains invalid characters' }
  }
  
  if (!NO_HTML_REGEX.test(trimmed)) {
    return { valid: false, error: 'HTML tags are not allowed' }
  }
  
  if (containsBadWords(trimmed)) {
    return { valid: false, error: 'Product name contains inappropriate language' }
  }
  
  return { valid: true }
}

/**
 * Validate product description
 */
export function validateProductDescription(description: string): { valid: boolean; error?: string } {
  const trimmed = description.trim()
  
  // Description is optional
  if (!trimmed) {
    return { valid: true }
  }
  
  if (trimmed.length > 2000) {
    return { valid: false, error: 'Description must not exceed 2000 characters' }
  }
  
  if (!SAFE_TEXT_REGEX.test(trimmed)) {
    return { valid: false, error: 'Description contains invalid characters' }
  }
  
  if (!NO_HTML_REGEX.test(trimmed)) {
    return { valid: false, error: 'HTML tags are not allowed' }
  }
  
  if (containsBadWords(trimmed)) {
    return { valid: false, error: 'Description contains inappropriate language' }
  }
  
  return { valid: true }
}

/**
 * Validate category name
 */
export function validateCategoryName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Category name is required' }
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Category name must be at least 2 characters' }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Category name must not exceed 100 characters' }
  }
  
  if (!SAFE_TEXT_REGEX.test(trimmed)) {
    return { valid: false, error: 'Category name contains invalid characters' }
  }
  
  if (containsBadWords(trimmed)) {
    return { valid: false, error: 'Category name contains inappropriate language' }
  }
  
  return { valid: true }
}
