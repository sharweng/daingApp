/**
 * KpiCard — Reusable KPI card component.
 *
 * Usage example:
 *   <KpiCard
 *     icon={<Package className="w-5 h-5 text-violet-600" />}
 *     iconBg="bg-violet-100"
 *     title="Total Products"
 *     emoji="📦"
 *     value="42"
 *     badge={<DynamicPercentageBadge value={12.5} size="xs" />}
 *     badgeLabel="vs last month"
 *     description="Total active products listed in your store"
 *   />
 */

import React from 'react'

interface KpiCardProps {
  /** Lucide icon element to show in the top-right colour bubble */
  icon: React.ReactNode
  /** Tailwind bg class for the icon bubble (e.g. "bg-violet-100") */
  iconBg?: string
  /** Optional emoji prefix for the title */
  emoji?: string
  /** Bold title text */
  title: string
  /** The big number / value displayed */
  value: React.ReactNode
  /** Optional badge element shown below the value (e.g. DynamicPercentageBadge) */
  badge?: React.ReactNode
  /** Small secondary label next to the badge */
  badgeLabel?: string
  /** Italic description below the border-t rule */
  description?: string
  /** Extra Tailwind classes on the outer container */
  className?: string
}

export function KpiCard({
  icon,
  iconBg = 'bg-slate-100',
  emoji,
  title,
  value,
  badge,
  badgeLabel,
  description,
  className = '',
}: KpiCardProps) {
  return (
    <div
      className={`bg-white border border-slate-300 rounded-xl p-4 flex flex-col justify-between min-h-[130px] ${className}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-slate-900 font-bold">
            {emoji ? `${emoji} ` : ''}{title}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {(badge || badgeLabel) && (
            <div className="flex items-center gap-1 mt-1">
              {badge}
              {badgeLabel && (
                <span className="text-[10px] text-slate-500">{badgeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
      </div>
      {description && (
        <p className="text-[10px] text-slate-700 italic mt-3 border-t border-slate-100 pt-2">
          {description}
        </p>
      )}
    </div>
  )
}

export default KpiCard
