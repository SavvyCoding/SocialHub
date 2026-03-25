"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, Loader2, Hash, TrendingUp, Users } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { UserCard } from "@/components/social/UserCard"
import { PostCard } from "@/components/feed/PostCard"
import { useDebounce } from "@/hooks/useDebounce"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserCardSkeleton, PostCardSkeleton, Skeleton } from "@/components/ui/skeleton"

type Tab = "people" | "posts" | "hashtags"
const TABS: { key: Tab; label: string }[] = [
  { key: "people", label: "People" },
  { key: "posts", label: "Posts" },
  { key: "hashtags", label: "Hashtags" },
]

export function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) ?? "people")
  const debouncedQuery = useDebounce(query, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set("q", debouncedQuery)
    if (tab !== "people") params.set("tab", tab)
    const qs = params.toString()
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false })
  }, [debouncedQuery, tab, router])

  const handleHashtagClick = (name: string) => {
    setQuery(`#${name}`)
    setTab("posts")
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search people, posts, or #hashtags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            onClick={() => setQuery("")}
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors relative",
              tab === key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "people" && <PeopleTab query={debouncedQuery} />}
      {tab === "posts" && <PostsTab query={debouncedQuery} />}
      {tab === "hashtags" && (
        <HashtagsTab query={debouncedQuery} onHashtagClick={handleHashtagClick} />
      )}
    </div>
  )
}

// ─── People tab ───────────────────────────────────────────────────────────────

function PeopleTab({ query }: { query: string }) {
  const { data: results, isLoading: searching } = trpc.user.search.useQuery(
    { q: query },
    { enabled: query.length >= 1, staleTime: 60_000 }
  )
  const { data: suggestions } = trpc.user.getSuggestions.useQuery(undefined, {
    enabled: query.length === 0, staleTime: 60_000,
  })

  if (query.length === 0) {
    return (
      <Section title="Suggested people to follow">
        {suggestions?.length ? (
          suggestions.map((u) => <UserCard key={u.id} user={u} />)
        ) : (
          <EmptyState icon={Users} text="No suggestions yet." />
        )}
      </Section>
    )
  }

  if (searching) {
    return (
      <div className="rounded-xl border bg-card divide-y">
        <UserCardSkeleton />
        <UserCardSkeleton />
        <UserCardSkeleton />
      </div>
    )
  }

  return (
    <Section title={`Results for "${query}"`}>
      {results?.length ? (
        results.map((u) => <UserCard key={u.id} user={u} />)
      ) : (
        <EmptyState icon={Users} text="No users found." />
      )}
    </Section>
  )
}

// ─── Posts tab ────────────────────────────────────────────────────────────────

function PostsTab({ query }: { query: string }) {
  const isHashtag = query.startsWith("#")
  const q = isHashtag ? query.slice(1) : query

  if (!q) {
    return (
      <div className="py-16 text-center space-y-2">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Search className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium">Search for posts by keyword</p>
        <p className="text-xs text-muted-foreground">or use <span className="font-mono">#hashtag</span> to find posts by tag</p>
      </div>
    )
  }

  if (isHashtag) return <HashtagPostFeed tag={q} />
  return <KeywordPostFeed q={q} />
}

function KeywordPostFeed({ q }: { q: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.post.search.useInfiniteQuery(
      { q, limit: 10 },
      { getNextPageParam: (last) => last.nextCursor, staleTime: 60_000 }
    )
  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card divide-y">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )
  }
  if (!posts.length) return <EmptyState icon={Search} text={`No posts found for "${q}".`} />

  return <PostFeed posts={posts} onLoadMore={fetchNextPage} hasMore={!!hasNextPage} loading={isFetchingNextPage} />
}

function HashtagPostFeed({ tag }: { tag: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.post.searchByHashtag.useInfiniteQuery(
      { tag, limit: 10 },
      { getNextPageParam: (last) => last.nextCursor, staleTime: 60_000 }
    )
  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card divide-y">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )
  }
  if (!posts.length) return <EmptyState icon={Hash} text={`No posts tagged #${tag}.`} />

  return (
    <>
      <p className="text-xs text-muted-foreground px-1">
        Showing posts tagged <span className="font-semibold text-primary">#{tag}</span>
      </p>
      <PostFeed posts={posts} onLoadMore={fetchNextPage} hasMore={!!hasNextPage} loading={isFetchingNextPage} />
    </>
  )
}

function PostFeed({
  posts,
  onLoadMore,
  hasMore,
  loading,
}: {
  posts: React.ComponentProps<typeof PostCard>["post"][]
  onLoadMore: () => void
  hasMore: boolean
  loading: boolean
}) {
  return (
    <div className="rounded-xl border bg-card divide-y">
      {posts.map((p, i) => <PostCard key={p.id} post={p} style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} />)}
      {hasMore && (
        <div className="flex justify-center py-3">
          <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loading} className="text-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Hashtags tab ─────────────────────────────────────────────────────────────

function HashtagsTab({
  query,
  onHashtagClick,
}: {
  query: string
  onHashtagClick: (name: string) => void
}) {
  const q = query.startsWith("#") ? query.slice(1) : query

  const { data: trending, isLoading: loadingTrend } = trpc.hashtag.getTrending.useQuery(
    { limit: 20 },
    { enabled: q.length === 0, staleTime: 60_000 }
  )
  const { data: searched, isLoading: loadingSearch } = trpc.hashtag.search.useQuery(
    { q },
    { enabled: q.length > 0, staleTime: 60_000 }
  )

  const tags = q ? searched : trending
  const isLoading = q ? loadingSearch : loadingTrend

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card divide-y">
        <div className="flex items-center gap-2 px-4 py-3">
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card divide-y">
      <div className="flex items-center gap-2 px-4 py-2.5">
        {q ? (
          <><Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Results for &ldquo;{q}&rdquo;</span></>
        ) : (
          <><TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Trending in the last 48 hours</span></>
        )}
      </div>

      {tags && tags.length > 0 ? (
        tags.map((tag) => (
          <button
            key={tag.name}
            onClick={() => onHashtagClick(tag.name)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">#{tag.name}</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {tag.count.toLocaleString()} {tag.count === 1 ? "post" : "posts"}
            </span>
          </button>
        ))
      ) : (
        <EmptyState icon={Hash} text={q ? `No hashtags matching "${q}".` : "No trending hashtags yet."} />
      )}
    </div>
  )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center px-3">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
