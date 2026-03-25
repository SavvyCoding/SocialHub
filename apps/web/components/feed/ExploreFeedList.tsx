"use client"

import { useEffect, useRef } from "react"
import { Loader2, Compass } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { PostCard } from "./PostCard"
import { PostCardSkeleton } from "@/components/ui/skeleton"

export function ExploreFeedList() {
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    trpc.post.getExploreFeed.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (lastPage) => lastPage.nextCursor, staleTime: 30_000 }
    )

  useEffect(() => {
    const el = bottomRef.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

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
        Failed to load posts.
      </div>
    )
  }

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Compass className="h-7 w-7 text-primary" />
        </div>
        <p className="font-medium">Nothing to explore yet</p>
        <p className="text-sm text-muted-foreground mt-1">Check back soon as more people join.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card divide-y">
      {posts.map((post, i) => (
        <PostCard key={post.id} post={post} style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} />
      ))}
      <div ref={bottomRef} className="py-4 flex justify-center">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!hasNextPage && posts.length > 0 && (
          <p className="text-xs text-muted-foreground">You&apos;ve seen everything</p>
        )}
      </div>
    </div>
  )
}
