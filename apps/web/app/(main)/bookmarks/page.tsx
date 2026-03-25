"use client"

import { Bookmark } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { PostCard } from "@/components/feed/PostCard"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { PostCardSkeleton } from "@/components/ui/skeleton"

export default function BookmarksPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.post.getBookmarks.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }
    )

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <Bookmark className="h-5 w-5" />
        <h1 className="text-xl font-bold">Bookmarks</h1>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 rounded-xl border bg-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bookmark className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-medium">No bookmarks yet</p>
            <p className="text-sm text-muted-foreground mt-1">Save posts you want to read later</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} />
          ))}
          {hasNextPage && (
            <div className="flex justify-center py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-primary"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
