"use client"

import { Sparkles, RefreshCw } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { PostCard } from "./PostCard"
import { PostCardSkeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

export function ForYouFeedList() {
  const { data, isLoading, isError, refetch, isFetching } =
    trpc.post.getForYouFeed.useQuery(
      { limit: 20 },
      { staleTime: 60_000 }
    )

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card divide-y">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
        Failed to load recommendations. Please refresh the page.
      </div>
    )
  }

  const posts = data?.posts ?? []

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <p className="font-medium">No recommendations yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Interact with posts and follow people to personalise your feed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Personalised for you
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} />
        ))}
      </div>
    </div>
  )
}
