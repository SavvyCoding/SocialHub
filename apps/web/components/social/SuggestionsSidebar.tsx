"use client"

import Link from "next/link"
import { Hash, TrendingUp } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { UserCard } from "./UserCard"
import { useSession } from "next-auth/react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SuggestionsSidebar() {
  const { data: session } = useSession()
  const { data: suggestions } = trpc.user.getSuggestions.useQuery(undefined, {
    enabled: !!session,
  })
  const { data: trending } = trpc.hashtag.getTrending.useQuery(
    { limit: 5 },
    { enabled: !!session }
  )

  if (!session) return null

  return (
    <div className="sticky top-20 space-y-4">
      {/* Who to follow */}
      {suggestions && suggestions.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Who to follow</h3>
          <div className="space-y-1 -mx-1">
            {suggestions.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
          <Link
            href="/search"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full mt-2 text-primary")}
          >
            See more suggestions
          </Link>
        </div>
      )}

      {/* Trending hashtags */}
      {trending && trending.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Trending</h3>
          </div>
          <div className="space-y-2">
            {trending.map((tag) => (
              <Link
                key={tag.name}
                href={`/search?q=%23${tag.name}&tab=posts`}
                className="flex items-center justify-between group px-1 py-1 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {tag.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {tag.count.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/search?tab=hashtags"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full mt-2 text-primary")}
          >
            See all trends
          </Link>
        </div>
      )}
    </div>
  )
}
