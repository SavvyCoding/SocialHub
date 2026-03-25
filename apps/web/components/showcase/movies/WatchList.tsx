"use client"

import { useState, useMemo } from "react"
import { Film, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { MovieCard } from "./MovieCard"
import { MovieSearch } from "./MovieSearch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "WATCHING", label: "Watching" },
  { key: "WANT_TO_WATCH", label: "Want to Watch" },
  { key: "WATCHED", label: "Watched" },
  { key: "DROPPED", label: "Dropped" },
] as const

const TYPE_TABS = [
  { key: "ALL", label: "All" },
  { key: "MOVIE", label: "Movies" },
  { key: "TV", label: "TV Shows" },
] as const

type StatusFilter = (typeof STATUS_TABS)[number]["key"]
type TypeFilter = (typeof TYPE_TABS)[number]["key"]

interface WatchListProps {
  userId: string
  isOwner: boolean
}

export function WatchList({ userId, isOwner }: WatchListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL")
  const [showSearch, setShowSearch] = useState(false)

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = trpc.movie.getWatchlist.useInfiniteQuery(
    { userId, status: statusFilter, mediaType: typeFilter },
    { getNextPageParam: (last) => last.nextCursor }
  )
  const list = data?.pages?.flatMap((p) => p.entries ?? []) ?? []

  const { data: stats } = trpc.movie.getStats.useQuery({ userId })

  // Build set of existing keys for duplicate prevention
  const { data: allEntriesData } = trpc.movie.getWatchlist.useInfiniteQuery(
    { userId, status: "ALL", mediaType: "ALL" },
    { getNextPageParam: (last) => last.nextCursor }
  )
  const existingKeys = useMemo(
    () => new Set((allEntriesData?.pages?.flatMap((p) => p.entries ?? []) ?? []).map((e) => `${e.tmdbId}-${e.mediaType}`)),
    [allEntriesData]
  )

  const totalMovies = stats?.breakdown.filter((b) => b.mediaType === "MOVIE").reduce((s, b) => s + b.count, 0) ?? 0
  const totalTV = stats?.breakdown.filter((b) => b.mediaType === "TV").reduce((s, b) => s + b.count, 0) ?? 0

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="font-bold">{stats.total}</span>
          <span className="text-muted-foreground">total</span>
          {totalMovies > 0 && <><span className="font-bold">{totalMovies}</span><span className="text-muted-foreground">movies</span></>}
          {totalTV > 0 && <><span className="font-bold">{totalTV}</span><span className="text-muted-foreground">TV shows</span></>}
        </div>
      )}

      {/* Add button (owner only) */}
      {isOwner && (
        <button
          onClick={() => setShowSearch((s) => !s)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Film className="h-4 w-4" />
          {showSearch ? "Close search" : "Add a movie or show"}
        </button>
      )}

      {isOwner && showSearch && (
        <MovieSearch userId={userId} existingKeys={existingKeys} />
      )}

      {/* Type filter */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(t.key)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              typeFilter === t.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {STATUS_TABS.map((t) => {
          const count = t.key === "ALL"
            ? stats?.total
            : stats?.breakdown.filter((b) => b.status === t.key && (typeFilter === "ALL" || b.mediaType === typeFilter)).reduce((s, b) => s + b.count, 0)
          return (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={cn(
                "flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                statusFilter === t.key
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

      {/* Movie list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed">
          <Film className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {isOwner ? "Nothing here yet. Search above to add something!" : "Nothing in this category yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((entry) => (
            <MovieCard key={entry.id} entry={entry} isOwner={isOwner} userId={userId} />
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
    </div>
  )
}
