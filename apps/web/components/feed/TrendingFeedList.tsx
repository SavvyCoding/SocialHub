"use client"

import { useEffect, useRef } from "react"
import { TrendingUp } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { PostCard } from "./PostCard"
import { PostCardSkeleton } from "@/components/ui/skeleton"

export function TrendingFeedList() {
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    trpc.post.getTrending.useInfiniteQuery(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialCursor: undefined,
        staleTime: 60_000,
      }
    )

  useEffect(() => {
    const el = bottomRef.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage()
        }
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
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
        Failed to load trending posts. Please refresh the page.
      </div>
    )
  }

  const posts = data?.pages.flatMap((page) => page.posts) ?? []

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No trending posts in the last 24 hours.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card divide-y">
      {posts.map((post, idx) => (
        <div key={post.id} className="relative">
          <span className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {idx + 1}
          </span>
          <div className="pl-2">
            <PostCard post={post as any} />
          </div>
        </div>
      ))}
      {hasNextPage && (
        <div ref={bottomRef} className="p-4 text-center text-sm text-muted-foreground">
          {isFetchingNextPage ? "Loading more..." : ""}
        </div>
      )}
    </div>
  )
}
