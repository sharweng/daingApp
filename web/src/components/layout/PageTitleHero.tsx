import React from 'react'

/**
 * Full-width page title area with optional background image (low opacity) and text box highlight.
 *
 * WHERE TO PUT BACKGROUND IMAGES:
 *   Directory:  public/assets/page-hero/
 *   Recommended size:  1920×400 px  (or 1920×300 for shorter).
 *
 * Filenames used by pages (you can add these files):
 *   - publications.jpg   (Publications: Local / Foreign)
 *   - login.jpg          (Sign in / Sign up page)
 *   - grade.jpg          (Grade page)
 *
 * In code, pass backgroundImage="/assets/page-hero/publications.jpg" etc.
 */
interface PageTitleHeroProps {
  title: string
  subtitle?: string
  /** e.g. /assets/page-hero/publications.jpg */
  backgroundImage?: string
}

export default function PageTitleHero({ title, subtitle, backgroundImage }: PageTitleHeroProps) {
  return (
    /* Full width of viewport (breaks out of max-w container) */
    <div
      className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden mb-8"
      style={{ minHeight: '180px' }}
    >
      {/* Full-width background image - higher opacity so pattern shows through */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            opacity: 0.65,
          }}
        />
      )}
      {!backgroundImage && (
        <div className="absolute inset-0 bg-slate-700" style={{ opacity: 0.9 }} />
      )}

      {/* Lighter overlay so bg image shows through more */}
      <div className="absolute inset-0 bg-slate-900/35" />

      {/* Text box: lower opacity so bg image visible behind it */}
      <div className="relative z-10 flex items-center justify-center min-h-[180px] p-8">
        <div
          className="bg-black/25 backdrop-blur-sm rounded-xl px-8 py-6 shadow-xl text-center max-w-2xl transition-all duration-300 hover:bg-black/35 hover:shadow-2xl"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
        >
          <h1 className="text-2xl md:text-4xl font-display font-semibold text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-slate-200 mt-2 text-sm md:text-base font-sans">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
