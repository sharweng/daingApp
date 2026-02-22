import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authService } from '../services/auth.service'

export interface AuthUser {
  id?: string
  name: string
  email: string
  avatar_url?: string | null
  role?: 'user' | 'seller' | 'admin'
}

interface AuthContextType {
  isLoggedIn: boolean
  isLoading: boolean
  user: AuthUser | null
  login: (token: string, user?: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser | null | ((prev: AuthUser | null) => AuthUser | null)) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const t = localStorage.getItem('token')
    setTokenState(t)
    if (!t) {
      setUser(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    authService.getCurrentUser().then((u) => {
      setUser({
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        avatar_url: u.avatar_url ?? null,
        role: u.role ?? 'user',
      })
    }).catch(() => setUser(null)).finally(() => setIsLoading(false))
  }, [token])

  const login = useCallback((t: string, u?: AuthUser) => {
    localStorage.setItem('token', t)
    setTokenState(t)
    if (u) setUser(u)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('rememberEmail')
    setTokenState(null)
    setUser(null)
  }, [])

  const value: AuthContextType = {
    isLoggedIn: !!token,
    isLoading,
    user,
    login,
    logout,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
