"use client"

import { useState } from "react"
import { Star } from "lucide-react"

interface StarRatingProps {
  value: number | null
  onChange?: (v: number) => void
  readonly?: boolean
  max?: number
  size?: "sm" | "md"
}

export function StarRating({ value, onChange, readonly = false, max = 5, size = "sm" }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value || 0
  const sz = size === "sm" ? "h-4 w-4" : "h-5 w-5"

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={readonly ? "cursor-default" : "cursor-pointer"}
          >
            <Star
              className={`${sz} transition-colors ${
                star <= active
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
