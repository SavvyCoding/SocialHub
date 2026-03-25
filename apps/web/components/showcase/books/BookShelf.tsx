"use client"

import { useState, useMemo } from "react"
import { BookOpen, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { BookCard } from "./BookCard"
import { BookSearch } from "./BookSearch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const TABS = [
  { key: "ALL", label: "All" },
  { key: "READING", label: "Reading" },
  { key: "WANT_TO_READ", label: "Want to Read" },
  { key: "READ", label: "Read" },
  { key: "DID_NOT_FINISH", label: "DNF" },
] as const

type StatusFilter = (typeof TABS)[number]["key"]

interface BookShelfProps {
  userId: string
  isOwner: boolean
}

export function BookShelf({ userId, isOwner }: BookShelfProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [showSearch, setShowSearch] = useState(false)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.book.getShelf.useInfiniteQuery(
      { userId, status: statusFilter, limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }
    )

  const shelf = data?.pages?.flatMap((p) => p.entries ?? []) ?? []

  const { data: stats } = trpc.book.getStats.useQuery({ userId })

  const { data: allBooksData } = trpc.book.getShelf.useInfiniteQuery(
    { userId, status: "ALL", limit: 100 },
    { getNextPageParam: (last) => last.nextCursor }
  )
  const existingIds = useMemo(
    () => new Set((allBooksData?.pages?.flatMap((p) => p.entries ?? []) ?? []).map((e) => e.olWorkId)),
    [allBooksData]
  )

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="font-bold">{stats.total}</span>
          <span className="text-muted-foreground">books total</span>
          {stats.byStatus["READ"] && (
            <><span className="font-bold text-green-600">{stats.byStatus["READ"]}</span><span className="text-muted-foreground">read</span></>
          )}
          {stats.byStatus["READING"] && (
            <><span className="font-bold text-blue-600">{stats.byStatus["READING"]}</span><span className="text-muted-foreground">reading</span></>
          )}
        </div>
      )}

      {/* Add book button (owner only) */}
      {isOwner && (
        <button
          onClick={() => setShowSearch((s) => !s)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          {showSearch ? "Close search" : "Add a book"}
        </button>
      )}

      {/* Search */}
      {isOwner && showSearch && (
        <BookSearch userId={userId} existingIds={existingIds} />
      )}

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {TABS.map((t) => (
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
            {stats?.byStatus[t.key] && t.key !== "ALL" && (
              <span className="ml-1 text-muted-foreground">({stats.byStatus[t.key]})</span>
            )}
            {t.key === "ALL" && stats?.total && (
              <span className="ml-1 text-muted-foreground">({stats.total})</span>
            )}
          </button>
        ))}
      </div>

      {/* Book list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : shelf.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {isOwner ? "No books here yet. Search above to add some!" : "Nothing in this category yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shelf.map((entry) => (
            <BookCard key={entry.id} entry={entry} isOwner={isOwner} userId={userId} />
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
