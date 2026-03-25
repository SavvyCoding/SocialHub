"use client"

import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { WatchList } from "@/components/showcase/movies/WatchList"

interface MoviesClientProps {
  username: string
}

export function MoviesClient({ username }: MoviesClientProps) {
  const { data: session } = useSession()
  const { data: user, isLoading } = trpc.user.getByUsername.useQuery({ username })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <p className="text-center text-muted-foreground py-12">User not found.</p>
  }

  const isOwner = session?.user?.id === user.id

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold">🎬 {isOwner ? "My Watchlist" : `${user.name}'s Watchlist`}</h1>
      <WatchList userId={user.id} isOwner={isOwner} />
    </div>
  )
}
