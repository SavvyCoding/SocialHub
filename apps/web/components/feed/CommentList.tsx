"use client"

import { Loader2, MessageCircle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { CommentCard } from "./CommentCard"
import { Skeleton } from "@/components/ui/skeleton"

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

interface CommentListProps {
  postId: string
}

export function CommentList({ postId }: CommentListProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.post.getComments.useInfiniteQuery(
      { postId, limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }
    )

  const allComments = data?.pages.flatMap((p) =>
    p.comments.map((c) => ({ ...c, postId }))
  ) ?? []

  if (isLoading) {
    return (
      <div className="space-y-0 divide-y">
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton />
      </div>
    )
  }

  if (allComments.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">
          No comments yet. Be the first!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {allComments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          onDeleted={() => {}} // deletion handled via query invalidation inside CommentCard
        />
      ))}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-primary text-sm"
          >
            {isFetchingNextPage
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : "Load more comments"}
          </Button>
        </div>
      )}
    </div>
  )
}
