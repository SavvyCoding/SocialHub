"use client"

import { useState } from "react"
import { AlertTriangle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ContentWarningProps {
  label?: string
  children: React.ReactNode
  className?: string
}

export function ContentWarning({ label = "Sensitive content", children, className }: ContentWarningProps) {
  const [revealed, setRevealed] = useState(false)

  if (revealed) {
    return (
      <div className={cn("relative", className)}>
        <button
          className="absolute top-1 right-1 z-10 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setRevealed(false)}
          aria-label="Hide content"
        >
          Hide
        </button>
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex flex-col items-center gap-2 text-center",
        className
      )}
      data-testid="content-warning"
    >
      <AlertTriangle className="h-5 w-5 text-amber-500" />
      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{label}</p>
      <p className="text-xs text-muted-foreground">This post may contain content some find disturbing</p>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
        onClick={() => setRevealed(true)}
      >
        <Eye className="h-3.5 w-3.5" />
        Show content
      </Button>
    </div>
  )
}
