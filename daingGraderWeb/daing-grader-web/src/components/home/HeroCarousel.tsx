import React, { useState, useEffect } from 'react'

/**
 * Carousel slide definition.
 * To use real images: put files in public/assets/carousel/ (e.g. slide1.jpg, slide2.jpg)
 * and set imageSrc to '/assets/carousel/slide1.jpg', etc.
 * See README or comments in this file for the exact path.
 */
export interface CarouselSlide {
  /** Title shown in the overlay box (e.g. "Daing" or "Coconut Trees") */
  title: string
  /** Brief description under the title (e.g. botanical name, tagline) */
  description: string
  /**
   * Image URL. Leave empty for colored placeholder.
   * Recommended: put images in public/assets/carousel/ then use:
   *   imageSrc: '/assets/carousel/slide1.jpg'
   * Image should cover full width; recommended size 1920×1080 or similar.
   */
  imageSrc?: string
  /** Used when imageSrc is not set - placeholder background color */
  placeholderColor: string
}

const slides: CarouselSlide[] = [
  {
    title: 'Daing',
    description: 'Dried fish (daing) — commonly used in Philippine cuisine and grading studies.',
    placeholderColor: '#dc2626', // red
    imageSrc: '/assets/carousel/slide1.jpg',
  },
  {
    title: 'Fish Grading',
    description: 'Quality classification and grading criteria for dried fish products.',
    placeholderColor: '#2563eb',
    imageSrc: '/assets/carousel/slide2.jpg',
  },
  {
    title: 'Dataset',
    description: 'Curated image dataset for training and evaluating grading models.',
    placeholderColor: '#16a34a',
    imageSrc: '/assets/carousel/slide3.jpg',
  },
  {
    title: 'DaingGrader',
    description: 'Educational system for fish grading and classification.',
    placeholderColor: '#ca8a04',
    imageSrc: '/assets/carousel/slide4.jpg',
  },
]

const AUTOPLAY_MS = 5000

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [])

  const goTo = (i: number) => setIndex(i)
  const slide = slides[index]

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1920/600', minHeight: '320px', maxHeight: '70vh' }}>
      {/* Full-bleed image area - no rounded corners, no white borders */}
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: i === index ? 1 : 0,
            zIndex: i === index ? 1 : 0,
          }}
        >
          {s.imageSrc ? (
            <img
              src={s.imageSrc}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ backgroundColor: s.placeholderColor }}
            />
          )}
        </div>
      ))}

      {/* Shadowed overlay box with title and description (UCAP-style) */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-8">
        <div className="max-w-3xl bg-slate-900/80 backdrop-blur-sm rounded-lg px-6 py-5 shadow-xl">
          <h2 className="text-2xl md:text-4xl font-bold text-white">{slide.title}</h2>
          <p className="text-sm md:text-base text-white/90 mt-2">{slide.description}</p>
          {/* Carousel dots */}
          <div className="flex gap-2 mt-4">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === index ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Carousel auto-plays. Use the dots to jump between slides. */}
    </div>
  )
}
