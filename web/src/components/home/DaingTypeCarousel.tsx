import React, { useState, useEffect } from 'react'

interface Slide {
  imageSrc?: string
  placeholderColor: string
  alt?: string
}

interface DaingTypeCarouselProps {
  slides: Slide[]
  title?: string
  /** Auto-play interval in ms; 0 = no auto-play */
  autoplayMs?: number
}

export default function DaingTypeCarousel({ slides, title, autoplayMs = 5000 }: DaingTypeCarouselProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (autoplayMs <= 0 || slides.length <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), autoplayMs)
    return () => clearInterval(t)
  }, [autoplayMs, slides.length])

  if (slides.length === 0) return null

  const slide = slides[index]

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '16/6', minHeight: '240px' }}>
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: i === index ? 1 : 0, zIndex: i === index ? 1 : 0 }}
        >
          {s.imageSrc ? (
            <img src={s.imageSrc} alt={s.alt || ''} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: s.placeholderColor }} />
          )}
        </div>
      ))}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/70 text-white px-6 py-3 text-lg font-semibold">
          {title}
        </div>
      )}
      <div className="absolute bottom-3 right-4 z-10 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === index ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
