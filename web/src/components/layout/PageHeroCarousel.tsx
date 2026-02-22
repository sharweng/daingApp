import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PageHeroCarouselProps {
  title: string
  subtitle?: string
  images: string[]
}

export default function PageHeroCarousel({ title, subtitle, images }: PageHeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [images.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  return (
    <div
      className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden mb-8"
      style={{ minHeight: '220px' }}
    >
      {/* Carousel images */}
      <div className="relative h-full">
        {images.map((image, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: index === currentIndex ? 1 : 0,
            }}
          >
            <div className="absolute inset-0 bg-slate-900/40" />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}

      {/* Text box */}
      <div className="relative z-10 flex items-center justify-center min-h-[220px] p-8">
        <div className="bg-black/30 backdrop-blur-sm rounded-xl px-8 py-6 shadow-xl text-center max-w-2xl border border-white/10">
          <h1 className="text-2xl md:text-4xl font-display font-semibold text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-slate-100 mt-2 text-sm md:text-base font-sans">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
