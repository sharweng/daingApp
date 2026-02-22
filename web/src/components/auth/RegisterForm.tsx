import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../ui/Input'
import PasswordInput from '../ui/PasswordInput'
import Button from '../ui/Button'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

export default function RegisterForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast, hideToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSeller, setIsSeller] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    showToast('Creating account...')

    try {
      // Admin code overrides role; seller checkbox is used when no admin code is provided.
      const role = adminCode.trim() ? 'admin' : (isSeller ? 'seller' : 'user')
      const response = await authService.register({
        name,
        email,
        password,
        role,
        admin_code: adminCode.trim() || undefined,
      })

      hideToast()
      showToast('Verification email sent. Please verify your email before logging in.')
      navigate('/login')
    } catch (err: any) {
      hideToast()
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err?.message ||
          'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    showToast('Signing in with Google...')

    try {
      const response = await authService.signInWithGoogle()

      if (response.token) {
        localStorage.setItem('token', response.token)
        login(response.token, {
          id: response.user?.id,
          name: response.user?.name || response.user?.email?.split('@')[0] || 'User',
          email: response.user?.email || '',
          avatar_url: response.user?.avatar_url ?? null,
          role: response.user?.role || 'user',
        })
      }

      hideToast()
      const userRole = response.user?.role || 'user'
      navigate(userRole === 'admin' ? '/admin' : userRole === 'seller' ? '/seller/dashboard' : '/profile')
    } catch (err: any) {
      hideToast()
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err?.message ||
          'Google sign-in failed. Please try again.'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <Input
        label="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        required
        error={error && name === '' ? 'Name is required' : null}
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@univ.edu"
        required
        error={error && email === '' ? 'Email is required' : null}
      />
      <PasswordInput
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••"
        required
        error={error && password === '' ? 'Password is required' : null}
      />
      <PasswordInput
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••"
        required
        error={error && confirmPassword === '' ? 'Please confirm your password' : null}
      />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isSeller}
          onChange={(e) => {
            setIsSeller(e.target.checked)
            // Clear admin code when registering as seller
            if (e.target.checked) setAdminCode('')
          }}
          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
        />
        Register as Seller
      </label>
      {/* Admin code field - only shown when NOT registering as seller */}
      {!isSeller && (
        <Input
          label="Admin Code (admins only)"
          type="password"
          value={adminCode}
          onChange={(e) => setAdminCode(e.target.value)}
          placeholder="Enter admin code if applicable"
        />
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-slate-500">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center justify-center gap-3"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {googleLoading ? 'Signing in...' : 'Sign in with Google'}
      </Button>
    </form>
  )
}
