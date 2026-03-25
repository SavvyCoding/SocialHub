"use client"

import { CheckCircle2, Circle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"

export function ProfileCompleteness() {
  const { data } = trpc.profile.getCompleteness.useQuery()

  if (!data) return null
  if (data.percent === 100) return null

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Profile completeness</h3>
        <span className="text-sm font-bold text-primary">{data.percent}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${data.percent}%` }}
        />
      </div>

      {/* Checklist */}
      <ul className="space-y-1.5">
        {data.checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-sm">
            {check.done ? (
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className={check.done ? "text-muted-foreground line-through" : ""}>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
