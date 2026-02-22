import React, { useState } from 'react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { sendContactMessage } from '../services/api'
import { Loader2 } from 'lucide-react'
import { validateName, validateEmail, validatePhone, validateRequired, validateLength } from '../utils/validation'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setFieldErrors({})
    
    // Validate all fields
    const errors: Record<string, string> = {}
    
    const nameValidation = validateName(name, 'Name')
    if (!nameValidation.valid) errors.name = nameValidation.error!
    
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) errors.email = emailValidation.error!
    
    if (contactNumber.trim()) {
      const phoneValidation = validatePhone(contactNumber)
      if (!phoneValidation.valid) errors.contactNumber = phoneValidation.error!
    }
    
    const subjectValidation = validateLength(subject, 3, 200, 'Subject')
    if (!subjectValidation.valid) errors.subject = subjectValidation.error!
    
    const messageValidation = validateLength(message, 10, 2000, 'Message')
    if (!messageValidation.valid) errors.message = messageValidation.error!
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    setLoading(true)
    try {
      await sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        contact_number: contactNumber.trim(),
        subject: subject.trim(),
        message: message.trim(),
      })
      setSuccess(true)
      setName('')
      setEmail('')
      setContactNumber('')
      setSubject('')
      setMessage('')
      setFieldErrors({})
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d?.msg ?? d).join(', ')
            : err.message || 'Failed to send message. Is the backend running?'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-lg">
        <h2 className="text-xl font-semibold text-blue-900">Contact Us</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <Input 
              label="Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              error={fieldErrors.name || null}
            />
          </div>
          <div>
            <Input 
              label="Email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              error={fieldErrors.email || null}
            />
          </div>
          <div>
            <Input 
              label="Contact Number" 
              placeholder="e.g. +63 912 345 6789" 
              value={contactNumber} 
              onChange={(e) => setContactNumber(e.target.value)}
              error={fieldErrors.contactNumber || null}
            />
          </div>
          <div>
            <Input 
              label="Subject" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              required 
              error={fieldErrors.subject || null}
            />
          </div>
          <div>
            <label className="text-sm text-slate-700 font-medium mb-1 block">Message</label>
            <textarea
              className={`w-full p-3 border bg-white text-slate-900 rounded-md h-36 shadow-sm hover:shadow-md focus:shadow-md focus:outline-none focus:ring-2 focus:border-blue-500 transition-all ${
                fieldErrors.message ? 'border-red-300 focus:ring-red-500/40' : 'border-blue-300 focus:ring-blue-500/40'
              }`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            {fieldErrors.message && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.message}</p>
            )}
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-300 rounded-lg px-3 py-2 shadow-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-300 rounded-lg px-3 py-2 shadow-sm">
              Message sent successfully. We&apos;ll get back to you soon.
            </div>
          )}
          <div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Sending…
                </>
              ) : (
                'Send Message'
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="card bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-lg">
        <h3 className="font-semibold text-blue-900">Contact Info</h3>
        <div className="mt-3 text-sm text-slate-700">
          shathesisgroup@gmail.com<br />
          Messages from the form are sent to this address.
        </div>
        <div className="mt-6 bg-blue-100 p-4 rounded-lg border border-blue-200">
          <img
            src="/assets/images/map.png"
            alt="Map"
            className="w-full max-w-[600px] h-[400px] object-cover rounded-lg"
          />
        </div>
      </div>
    </div>
  )
}
