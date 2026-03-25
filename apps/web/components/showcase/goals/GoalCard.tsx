"use client"

import { useState } from "react"
import { Check, Trash2, Calendar, Tag } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface Goal {
  id: string
  title: string
  description?: string | null
  category?: string | null
  isCompleted: boolean
  completedAt?: Date | string | null
  targetDate?: Date | string | null
}

interface GoalCardProps {
  goal: Goal
  isOwner: boolean
  userId: string
}

export function GoalCard({ goal, isOwner, userId }: GoalCardProps) {
  const [optimisticCompleted, setOptimisticCompleted] = useState(goal.isCompleted)
  const utils = trpc.useUtils()

  const toggleComplete = trpc.goal.toggleComplete.useMutation({
    onMutate: () => setOptimisticCompleted((v) => !v),
    onSuccess: () => {
      utils.goal.getGoals.invalidate({ userId })
      utils.goal.getStats.invalidate({ userId })
    },
    onError: () => setOptimisticCompleted(goal.isCompleted),
  })

  const deleteGoal = trpc.goal.deleteGoal.useMutation({
    onSuccess: () => {
      utils.goal.getGoals.invalidate({ userId })
      utils.goal.getStats.invalidate({ userId })
    },
  })

  const targetDate = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null

  const completedDate = goal.completedAt
    ? new Date(goal.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null

  const isOverdue = goal.targetDate && !goal.isCompleted && new Date(goal.targetDate) < new Date()

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 transition-colors",
        optimisticCompleted && "opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Completion toggle */}
        {isOwner ? (
          <button
            onClick={() => toggleComplete.mutate({ id: goal.id })}
            disabled={toggleComplete.isPending}
            className={cn(
              "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              optimisticCompleted
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground/40 hover:border-primary"
            )}
          >
            {optimisticCompleted && <Check className="h-3 w-3" />}
          </button>
        ) : (
          <div
            className={cn(
              "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
              optimisticCompleted ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/40"
            )}
          >
            {optimisticCompleted && <Check className="h-3 w-3" />}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              optimisticCompleted && "line-through text-muted-foreground"
            )}
          >
            {goal.title}
          </p>

          {goal.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {goal.category && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" />
                {goal.category}
              </span>
            )}
            {completedDate && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" />
                Done {completedDate}
              </span>
            )}
            {targetDate && !optimisticCompleted && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {isOverdue ? "Overdue · " : "By "}
                {targetDate}
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => deleteGoal.mutate({ id: goal.id })}
            disabled={deleteGoal.isPending}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
