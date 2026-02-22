/**
 * Grade page (web): upload/capture → preview → analyze. Matches mobile flow (DaingApp ScanScreen).
 * Backend: POST /analyze (same as mobile, saves to Cloudinary + history) — no backend changes.
 */
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { analyzeImage } from '../services/api'
import Button from '../components/ui/Button'
import PageTitleHero from '../components/layout/PageTitleHero'
import { Upload, Camera, Loader2, Lightbulb, RotateCcw, X, History, AlertTriangle } from 'lucide-react'
import { DAING_TYPES } from '../data/daingTypes'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const ACCEPT = '.png,.jpg,.jpeg'
const MAX_FILE_MB = 10

const GRADE_CAROUSEL_SLIDES = DAING_TYPES.map((t) => ({
  name: t.name,
  imageSrc: t.carousel[0]?.imageSrc,
  placeholderColor: t.carousel[0]?.placeholderColor ?? '#1e3a5f',
  alt: t.carousel[0]?.alt ?? `${t.name} dried fish`,
}))

const CAROUSEL_INTERVAL_MS = 4000

export default function GradePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [cameraActive, setCameraActive] = useState(false)
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user is logged in
  useEffect(() => {
    if (!authLoading && !user) {
      showToast('Please log in to use the AI Fish Scanner. Your scan history will be saved to your account.', 'warning')
      navigate('/login', { state: { from: '/grade' } })
    }
  }, [user, authLoading, navigate, showToast])

  // Attach stream to video when video element is in DOM (fixes blank camera preview)
  useEffect(() => {
    if (cameraActive && pendingStream && videoRef.current) {
      videoRef.current.srcObject = pendingStream
      streamRef.current = pendingStream
      setPendingStream(null)
    }
  }, [cameraActive, pendingStream])

  useEffect(() => {
    const id = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % GRADE_CAROUSEL_SLIDES.length)
    }, CAROUSEL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const clearPreview = () => {
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl)
    setCapturedImageUrl(null)
    setCapturedFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const reset = () => {
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setCapturedImageUrl(null)
    setCapturedFile(null)
    setResultUrl(null)
    setError(null)
    stopCamera()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setPendingStream(null)
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopCamera()
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl)
    setCapturedImageUrl(null)
    setCapturedFile(null)
    setError(null)
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_MB} MB`)
      return
    }
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['png', 'jpg', 'jpeg'].includes(ext || '')) {
      setError('Only PNG or JPG images are allowed')
      return
    }
    setCapturedFile(f)
    setCapturedImageUrl(URL.createObjectURL(f))
  }

  const startCamera = async () => {
    clearPreview()
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setPendingStream(stream)
      setCameraActive(true)
    } catch {
      setError('Could not access camera. Allow camera permission or use file upload.')
    }
  }

  const capturePhoto = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current
      if (!video || !video.videoWidth) {
        reject(new Error('Video not ready'))
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas error'))
        return
      }
      ctx.drawImage(video, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], 'capture.jpg', { type: 'image/jpeg' }))
          } else {
            reject(new Error('Capture failed'))
          }
        },
        'image/jpeg',
        0.9
      )
    })
  }

  const handleCapture = async () => {
    try {
      const file = await capturePhoto()
      stopCamera()
      setCapturedFile(file)
      setCapturedImageUrl(URL.createObjectURL(file))
    } catch {
      setError('Capture failed')
    }
  }

  const handleAnalyze = async () => {
    if (!capturedFile) return
    setLoading(true)
    setError(null)
    setResultUrl(null)
    try {
      const blob = await analyzeImage(capturedFile)
      setResultUrl(URL.createObjectURL(blob))
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Analysis failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const handleChooseFile = () => {
    stopCamera()
    fileInputRef.current?.click()
  }

  const slide = GRADE_CAROUSEL_SLIDES[carouselIndex]

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Don't render if user is not logged in (redirect will happen via useEffect)
  if (!user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Login Required</h2>
          <p className="text-slate-600 mb-4">Please log in to use the AI Fish Scanner.</p>
          <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageTitleHero
        title="Grade Dried Fish"
        subtitle="Upload or capture an image, preview it, then analyze. Same flow as mobile."
        backgroundImage="/assets/page-hero/grade.jpg"
      />

      <div className="flex justify-end mb-4">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-400 shadow-md hover:shadow-lg transition-all duration-200 text-blue-700 font-semibold"
        >
          <History className="w-5 h-5" />
          History
        </Link>
      </div>

      {resultUrl && (
        <div className="card max-w-2xl bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Analysis Result</h2>
          <img src={resultUrl} alt="Analysis result" className="w-full rounded-xl border border-blue-200 shadow-md" />
          <p className="text-sm text-slate-500 mt-2">Annotated image from backend (saved to Cloudinary + history).</p>
          <Button type="button" onClick={reset} className="mt-4">
            Scan Another
          </Button>
        </div>
      )}

      {!resultUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <div className="card bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-4">Preview</h2>

              {/* Always show Choose file + Use camera (or Close camera when active) */}
              <div className="flex flex-wrap gap-2 mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={handleChooseFile} className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Choose file
                </Button>
                {cameraActive ? (
                  <Button type="button" variant="outline" onClick={stopCamera} className="flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Close camera
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={startCamera} className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Use camera
                  </Button>
                )}
              </div>

              {/* Preview area: camera feed or uploaded/captured image */}
              {cameraActive ? (
                <div className="space-y-3">
                  <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden min-h-[200px] border border-blue-200 shadow-md">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ minHeight: 200 }}
                    />
                  </div>
                  <Button type="button" onClick={handleCapture} className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Capture photo
                  </Button>
                </div>
              ) : capturedImageUrl ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-blue-50 border border-blue-300 shadow-md min-h-[200px]">
                    <img
                      src={capturedImageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      style={{ minHeight: 200 }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={clearPreview} className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Retake
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing…
                        </>
                      ) : (
                        'Analyze image'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-8 text-center">
                  Choose a file or use your camera to get started.
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm shadow-md">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 shadow-md">
              <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
                Tips for a clear photo
              </h3>
              <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                <li>Use <strong>good lighting</strong> (avoid shadows).</li>
                <li>Place fish on a <strong>plain, contrasting background</strong>.</li>
                <li>Capture the <strong>whole fish</strong> in frame when possible.</li>
              </ul>
            </div>
          </div>

          <div className="card bg-gradient-to-b from-white to-blue-50 border border-blue-200 shadow-lg overflow-hidden">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Example: Daing types</h2>
            <p className="text-sm text-slate-600 mb-4">Reference images for the types we grade.</p>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-blue-100 border border-blue-300 shadow-md">
              {slide.imageSrc ? (
                <img src={slide.imageSrc} alt={slide.alt} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" />
              ) : (
                <div className="absolute inset-0 transition-opacity duration-500" style={{ backgroundColor: slide.placeholderColor }} />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                <span className="text-white font-semibold text-sm">{slide.name}</span>
              </div>
            </div>
            <div className="flex justify-center gap-1.5 mt-3">
              {GRADE_CAROUSEL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCarouselIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${i === carouselIndex ? 'bg-primary scale-125' : 'bg-slate-300 hover:bg-slate-400'}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
