import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface ToastContextType {
  showToast: (message: string) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setMessage(msg || null)
  }, [])

  const hideToast = useCallback(() => setMessage(null), [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(t)
  }, [message])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {message != null && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl bg-slate-800 text-white text-sm font-medium shadow-lg"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) return { showToast: () => {}, hideToast: () => {} }
  return ctx
}
