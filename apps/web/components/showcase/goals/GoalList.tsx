"use client"

import { useState } from "react"
import { Target, Plus, Loader2, CheckCircle2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { GoalCard } from "./GoalCard"
import { AddGoalModal } from "./AddGoalModal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FILTER_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "In Progress" },
  { key: "DONE", label: "Completed" },
] as const

type Filter = (typeof FILTER_TABS)[number]["key"]

interface GoalListProps {
  userId: string
  isOwner: boolean
}

export function GoalList({ userId, isOwner }: GoalListProps) {
  const [filter, setFilter] = useState<Filter>("ALL")
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = trpc.goal.getGoals.useInfiniteQuery(
    { userId, ...(filter === "DONE" ? { completed: true } : filter === "PENDING" ? { completed: false } : {}) },
    { getNextPageParam: (last) => last.nextCursor }
  )
  const goals = data?.pages?.flatMap((p) => p.entries ?? []) ?? []

  const { data: stats } = trpc.goal.getStats.useQuery({ userId })

  // Group goals by category
  const grouped = goals.reduce<Record<string, typeof goals>>((acc, goal) => {
    const cat = goal.category ?? "Uncategorized"
    if (!acc[cat]) acc[cat] = []
    acc[cat]!.push(goal)
    return acc
  }, {})

  const categoryOrder = Object.keys(grouped).sort((a, b) =>
    a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b)
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="flex gap-4 text-sm flex-wrap">
          <span className="font-bold">{stats.total}</span>
          <span className="text-muted-foreground">goals</span>
          {stats.completed > 0 && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500 self-center" />
              <span className="font-bold text-green-600">{stats.completed}</span>
              <span className="text-muted-foreground">completed</span>
            </>
          )}
          {stats.pending > 0 && (
            <>
              <span className="font-bold">{stats.pending}</span>
              <span className="text-muted-foreground">in progress</span>
            </>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {FILTER_TABS.map((t) => {
          const count = t.key === "ALL" ? stats?.total : t.key === "DONE" ? stats?.completed : stats?.pending
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                "flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                filter === t.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {count ? <span className="ml-1 text-muted-foreground">({count})</span> : null}
            </button>
          )
        })}
      </div>

      {/* Add button (owner only) */}
      {isOwner && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add a goal
        </button>
      )}

      {/* Goals grouped by category */}
      {goals.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed">
          <Target className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter !== "ALL"
              ? "No goals in this category."
              : isOwner
              ? "No goals yet. Add your first goal above!"
              : "No goals added yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {categoryOrder.map((cat) => (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h3>
              <div className="space-y-2">
                {grouped[cat]!.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} isOwner={isOwner} userId={userId} />
                ))}
              </div>
            </div>
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-primary">
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}

      {showAdd && <AddGoalModal userId={userId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
