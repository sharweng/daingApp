import React from 'react'
import { Badge } from '@mantine/core'

interface PercentageBadgeProps {
  value: number
  variant?: 'default' | 'light' | 'dot'
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

/**
 * Trevor-style dynamic percentage badge
 * - Green for positive values (+X%)
 * - Red for negative values (-X%)
 * - Shows increase/decrease relative to previous period
 */
export function DynamicPercentageBadge({ value, variant = 'light', size = 'xs' }: PercentageBadgeProps) {
  const isPositive = value >= 0
  const color = isPositive ? 'green' : 'red'
  const displayValue = `${isPositive ? '+' : ''}${value}%`

  return (
    <Badge color={color} variant={variant} size={size} className="font-semibold">
      {displayValue}
    </Badge>
  )
}
