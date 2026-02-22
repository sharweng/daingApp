import api from './api'
import { auth } from './firebase'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth'

export const authService = {
  /**
   * Login user
   * Firebase Auth + backend profile fetch
   */
  async login(email: string, password: string, admin_code?: string) {
    if (admin_code) {
      // Admin code is only used during registration for role assignment.
      console.warn('Admin code is ignored for login.')
    }

    const credential = await signInWithEmailAndPassword(auth, email, password)
    const user = credential.user

    if (!user.emailVerified) {
      await sendEmailVerification(user)
      await signOut(auth)
      throw new Error('Please verify your email first. A new verification email was sent.')
    }

    const token = await user.getIdToken()
    localStorage.setItem('token', token)
    const response = await api.get('/auth/me')
    return { token, user: response.data }
  },

  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, provider)
    const user = credential.user

    const token = await user.getIdToken()
    localStorage.setItem('token', token)

    // Check if user exists in backend
    try {
      const response = await api.get('/auth/me')
      return { token, user: response.data }
    } catch (err: any) {
      // User doesn't exist, create profile automatically
      if (err.response?.status === 401 || err.response?.status === 404) {
        const name = user.displayName || user.email?.split('@')[0] || 'User'
        const response = await api.post('/auth/register-firebase', {
          name,
          email: user.email,
          role: 'user',
        })
        return { token, user: response.data }
      }
      throw err
    }
  },

  /**
   * Register new user
   * Firebase Auth + backend profile creation
   */
  async register(userData: { name: string; email: string; password: string; role?: string; admin_code?: string }) {
    const credential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
    const user = credential.user

    await sendEmailVerification(user)
    const token = await user.getIdToken()
    localStorage.setItem('token', token)

    const response = await api.post('/auth/register-firebase', {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      admin_code: userData.admin_code,
    })

    await signOut(auth)
    localStorage.removeItem('token')
    return { token: null, user: response.data, requiresVerification: true }
  },

  /**
   * Logout user - clears stored token
   */
  logout() {
    signOut(auth).catch(() => undefined)
    localStorage.removeItem('token')
    localStorage.removeItem('rememberEmail')
  },

  /**
   * Get current user from token (GET /auth/me)
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data
  },

  /**
   * Update profile (name) - PATCH /auth/profile
   */
  async updateProfile(data: {
    name?: string
    full_name?: string
    phone?: string
    email?: string
    city?: string
    street_address?: string
    province?: string
    postal_code?: string
    gender?: string
  }) {
    const response = await api.patch('/auth/profile', data)
    return response.data
  },

  /**
   * Upload profile avatar - POST /auth/profile/avatar (saves to Cloudinary + MongoDB)
   */
  async uploadProfileAvatar(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/auth/profile/avatar', formData)
    return response.data
  },
}
