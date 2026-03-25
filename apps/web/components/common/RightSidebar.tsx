"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Hash, TrendingUp, BookOpen, Film, Target, Flame, VolumeX, X, Plus } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { UserCard } from "@/components/social/UserCard"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { LiveActivityFeed } from "@/components/common/LiveActivityFeed"

export function RightSidebar() {
  const { data: session } = useSession()
  const username = session?.user?.username ?? ""
  const userId = session?.user?.id
  const [newKeyword, setNewKeyword] = useState("")

  const { data: trending } = trpc.hashtag.getTrending.useQuery(
    { limit: 5 },
    { enabled: !!session }
  )
  const { data: suggestions } = trpc.user.getSuggestions.useQuery(undefined, {
    enabled: !!session,
  })
  const { data: readingBooks } = trpc.book.getShelf.useQuery(
    { userId: userId!, status: "READING", limit: 3 },
    { enabled: !!userId, staleTime: 5 * 60_000 }
  )
  const { data: watchingShows } = trpc.movie.getWatchlist.useQuery(
    { userId: userId!, status: "WATCHING", limit: 3 },
    { enabled: !!userId, staleTime: 5 * 60_000 }
  )
  const { data: goalStats } = trpc.goal.getStats.useQuery(
    { userId: userId! },
    { enabled: !!userId, staleTime: 5 * 60_000 }
  )
  const { data: mutedKeywords, refetch: refetchMuted } = trpc.user.getMutedKeywords.useQuery(undefined, {
    enabled: !!session,
  })
  const addMuted = trpc.user.addMutedKeyword.useMutation({ onSuccess: () => { refetchMuted(); setNewKeyword("") } })
  const removeMuted = trpc.user.removeMutedKeyword.useMutation({ onSuccess: () => refetchMuted() })

  if (!session) return null

  const readingEntries = readingBooks?.entries ?? []
  const watchingEntries = watchingShows?.entries ?? []
  const goalTotal = goalStats?.total ?? 0
  const goalCompleted = goalStats?.completed ?? 0

  return (
    <aside className="hidden xl:block w-80 flex-shrink-0 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto py-4 px-3 space-y-4 scrollbar-none">
      {/* Live Activity Feed */}
      <LiveActivityFeed />

      {/* Trending */}
      {trending && trending.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Trending</h3>
          </div>
          <div className="space-y-1.5">
            {trending.map((tag) => (
              <Link
                key={tag.name}
                href={`/search?q=%23${tag.name}&tab=posts`}
                className="flex items-center justify-between px-1 py-1.5 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{tag.name}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{tag.count}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Who to follow */}
      {suggestions && suggestions.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">Who to follow</h3>
          <div className="space-y-1 -mx-1">
            {suggestions.slice(0, 3).map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </Card>
      )}

      {/* Muted Keywords */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <VolumeX className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Muted Keywords</h3>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const kw = newKeyword.trim()
            if (kw) addMuted.mutate({ keyword: kw })
          }}
          className="flex items-center gap-1.5 mb-2"
        >
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add keyword..."
            maxLength={100}
            className="flex-1 rounded-lg border bg-background px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!newKeyword.trim() || addMuted.isPending}
            className="rounded-lg bg-primary text-primary-foreground px-2 py-1 text-xs disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
          </button>
        </form>
        {mutedKeywords && mutedKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {mutedKeywords.map((kw) => (
              <span key={kw.id} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                {kw.keyword}
                <button
                  onClick={() => removeMuted.mutate({ id: kw.id })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No muted keywords. Posts containing muted words are hidden from your feed.</p>
        )}
      </Card>

      {/* Currently Reading */}
      {readingEntries.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Reading Now</h3>
            </div>
            <Link href={`/profile/${username}/books`} className="text-xs text-primary hover:underline">
              See all
            </Link>
          </div>
          <div className="space-y-2.5">
            {readingEntries.map((book) => (
              <div key={book.id} className="flex items-start gap-2.5">
                {book.coverUrl && (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    width={32}
                    height={48}
                    className="rounded-sm object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{book.title}</p>
                  {book.author && <p className="text-xs text-muted-foreground truncate">{book.author}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Currently Watching */}
      {watchingEntries.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Watching Now</h3>
            </div>
            <Link href={`/profile/${username}/movies`} className="text-xs text-primary hover:underline">
              See all
            </Link>
          </div>
          <div className="space-y-2.5">
            {watchingEntries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2.5">
                {entry.posterUrl && (
                  <Image
                    src={entry.posterUrl}
                    alt={entry.title}
                    width={32}
                    height={48}
                    className="rounded-sm object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">{entry.mediaType === "TV" ? "TV Show" : "Movie"}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Goal Progress */}
      {goalTotal > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Goals</h3>
            </div>
            <Link href={`/profile/${username}/goals`} className="text-xs text-primary hover:underline">
              See all
            </Link>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-2xl font-bold">{goalCompleted}</span>
              <span className="text-xs text-muted-foreground">of {goalTotal} completed</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                style={{ width: `${Math.round((goalCompleted / goalTotal) * 100)}%` }}
              />
            </div>
            {(goalStats?.maxStreak ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span>Best streak: {goalStats?.maxStreak} days</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </aside>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-4">{children}</div>
}
