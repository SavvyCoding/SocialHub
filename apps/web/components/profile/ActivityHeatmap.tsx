"use client"

import { useMemo, useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface ActivityHeatmapProps {
  userId: string
}

export function ActivityHeatmap({ userId }: ActivityHeatmapProps) {
  const { data } = trpc.user.getActivityHeatmap.useQuery(
    { userId, days: 365 },
    { staleTime: 10 * 60_000 }
  )
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null)

  const { grid, months, totalPosts } = useMemo(() => {
    const activityMap = new Map<string, number>()
    let total = 0
    for (const entry of data ?? []) {
      activityMap.set(entry.date, entry.count)
      total += entry.count
    }

    const today = new Date()
    const weeks: { date: string; count: number; dayOfWeek: number }[][] = []
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = []
    const monthLabels: { label: string; weekIndex: number }[] = []
    let lastMonth = -1

    // Go back 364 days to fill 52 weeks
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const dayOfWeek = d.getDay()
      const count = activityMap.get(dateStr) ?? 0

      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth()
        monthLabels.push({
          label: d.toLocaleString("en", { month: "short" }),
          weekIndex: weeks.length,
        })
      }

      currentWeek.push({ date: dateStr, count, dayOfWeek })
    }
    if (currentWeek.length > 0) weeks.push(currentWeek)

    return { grid: weeks, months: monthLabels, totalPosts: total }
  }, [data])

  function getColor(count: number) {
    if (count === 0) return "bg-muted"
    if (count === 1) return "bg-primary/25"
    if (count <= 3) return "bg-primary/45"
    if (count <= 5) return "bg-primary/65"
    return "bg-primary"
  }

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""]

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Activity</h3>
        <span className="text-xs text-muted-foreground">{totalPosts} posts in the last year</span>
      </div>

      <div className="relative overflow-x-auto">
        {/* Month labels */}
        <div className="flex text-[10px] text-muted-foreground mb-1 ml-7">
          {months.map((m, i) => (
            <span
              key={`${m.label}-${i}`}
              className="absolute"
              style={{ left: `${m.weekIndex * 14 + 28}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-0.5 mt-5">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-0.5 mr-1 text-[10px] text-muted-foreground">
            {dayLabels.map((label, i) => (
              <div key={i} className="h-[10px] w-5 flex items-center justify-end pr-0.5">
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }, (_, di) => {
                const day = week.find((d) => d.dayOfWeek === di)
                if (!day) return <div key={di} className="h-[10px] w-[10px]" />
                return (
                  <div
                    key={di}
                    className={cn("h-[10px] w-[10px] rounded-[2px] cursor-pointer transition-colors", getColor(day.count))}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredDay({ date: day.date, count: day.count, x: rect.left, y: rect.top })
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground justify-end">
          <span>Less</span>
          <div className="h-[10px] w-[10px] rounded-[2px] bg-muted" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-primary/25" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-primary/45" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-primary/65" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-primary" />
          <span>More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-foreground text-background rounded shadow-lg pointer-events-none"
          style={{ left: hoveredDay.x - 30, top: hoveredDay.y - 30 }}
        >
          {hoveredDay.count} post{hoveredDay.count !== 1 ? "s" : ""} on {hoveredDay.date}
        </div>
      )}
    </div>
  )
}
