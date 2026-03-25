"use client"

import Link from "next/link"
import Image from "next/image"
import { Hash, TrendingUp, BookOpen, Film, Target, Flame } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { UserCard } from "@/components/social/UserCard"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { LiveActivityFeed } from "@/components/common/LiveActivityFeed"

export function RightSidebar() {
  const { data: session } = useSession()
  const username = session?.user?.username ?? ""
  const userId = session?.user?.id

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
