import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
}

export default function PasswordInput({ label, error, className = '', ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="text-sm text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className="px-3 py-2 pr-10 w-full border border-slate-200 rounded-lg bg-white transition-all duration-200
            hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:shadow-md"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  )
}
