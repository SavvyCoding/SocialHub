"use client"

import { useState } from "react"

interface RatingBarProps {
  value: number | null
  onChange?: (v: number) => void
  readonly?: boolean
  max?: number
}

export function RatingBar({ value, onChange, readonly = false, max = 10 }: RatingBarProps) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value || 0

  const color = (v: number) => {
    if (v <= 3) return "bg-red-500"
    if (v <= 6) return "bg-amber-500"
    if (v <= 8) return "bg-yellow-400"
    return "bg-green-500"
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1
          return (
            <button
              key={n}
              type="button"
              disabled={readonly}
              onClick={() => onChange?.(n)}
              onMouseEnter={() => !readonly && setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className={`h-5 w-3 rounded-sm transition-colors ${
                n <= active ? color(active) : "bg-muted"
              } ${readonly ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
            />
          )
        })}
      </div>
      {active > 0 && (
        <span className="text-xs font-medium text-muted-foreground">{active}/{max}</span>
      )}
    </div>
  )
}
