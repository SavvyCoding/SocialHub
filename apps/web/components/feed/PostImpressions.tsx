"use client"

import { Eye } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface PostImpressionsProps {
  postId: string
  className?: string
}

export function PostImpressions({ postId, className }: PostImpressionsProps) {
  const { data, isLoading } = trpc.post.getImpressions.useQuery({ postId })

  if (isLoading) {
    return (
      <span className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Eye className="h-3 w-3" />
        <span className="w-8 h-3 bg-muted animate-pulse rounded" />
      </span>
    )
  }

  if (!data) return null

  return (
    <span
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
      title="Unique impressions"
      data-testid="post-impressions"
    >
      <Eye className="h-3 w-3" />
      {data.impressionCount.toLocaleString()} impression{data.impressionCount !== 1 ? "s" : ""}
    </span>
  )
}
