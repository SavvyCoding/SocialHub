"use client"

import { useState } from "react"
import Image from "next/image"
import { Search, Loader2, Plus, Check, Film, Tv } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Button } from "@/components/ui/button"

const TMDB_POSTER = (path: string | null | undefined) =>
  path ? `https://image.tmdb.org/t/p/w92${path}` : null

interface MovieSearchProps {
  userId: string
  existingKeys: Set<string>
}

export function MovieSearch({ userId, existingKeys }: MovieSearchProps) {
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState<string | null>(null)
  const debouncedQ = useDebounce(query, 400)

  const utils = trpc.useUtils()

  const { data: results, isLoading } = trpc.movie.search.useQuery(
    { q: debouncedQ },
    { enabled: debouncedQ.length >= 2 }
  )

  const addMovie = trpc.movie.addMovie.useMutation({
    onSuccess: () => {
      utils.movie.getWatchlist.invalidate({ userId })
      utils.movie.getStats.invalidate({ userId })
      setAdding(null)
    },
    onError: () => setAdding(null),
  })

  const handleAdd = (item: {
    id: number
    media_type: "movie" | "tv" | "person"
    title?: string
    name?: string
    poster_path?: string | null
    release_date?: string
    first_air_date?: string
  }) => {
    const mediaType = item.media_type === "tv" ? "TV" : "MOVIE"
    const key = `${item.id}-${mediaType}`
    const posterPath = item.poster_path
    setAdding(key)
    addMovie.mutate({
      tmdbId: item.id,
      mediaType,
      title: (item.title ?? item.name) || "Unknown",
      posterUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined,
      releaseYear: parseInt((item.release_date ?? item.first_air_date ?? "").slice(0, 4)) || undefined,
      status: "WANT_TO_WATCH",
    })
  }

  const noTmdbKey = results?.length === 0 && debouncedQ.length >= 2 && !isLoading

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a movie or TV show..."
          className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {!process.env.NEXT_PUBLIC_TMDB_CONFIGURED && noTmdbKey && (
        <p className="text-xs text-muted-foreground text-center py-2 rounded-lg border bg-muted/30">
          Add <code className="text-xs bg-muted px-1 rounded">TMDB_READ_ACCESS_TOKEN</code> to .env.local to enable search.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="rounded-lg border bg-card divide-y max-h-80 overflow-y-auto">
          {results.map((item) => {
            const mediaType = item.media_type === "tv" ? "TV" : "MOVIE"
            const key = `${item.id}-${mediaType}`
            const alreadyAdded = existingKeys.has(key)
            const posterSrc = TMDB_POSTER(item.poster_path)
            const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4)

            return (
              <div key={key} className="flex items-center gap-3 p-2.5">
                <div className="flex-shrink-0 w-9 h-14 rounded overflow-hidden bg-muted relative">
                  {posterSrc ? (
                    <Image src={posterSrc} alt={item.title ?? item.name ?? ""} fill className="object-cover" sizes="36px" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      {item.media_type === "tv" ? <Tv className="h-4 w-4 text-muted-foreground" /> : <Film className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title ?? item.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {item.media_type === "tv" ? <Tv className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                    {item.media_type === "tv" ? "TV Show" : "Movie"}
                    {year && ` · ${year}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={alreadyAdded ? "outline" : "default"}
                  className="flex-shrink-0 h-7 text-xs"
                  onClick={() => !alreadyAdded && handleAdd(item)}
                  disabled={alreadyAdded || adding === key || addMovie.isPending}
                >
                  {adding === key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : alreadyAdded ? (
                    <><Check className="h-3 w-3 mr-1" />Added</>
                  ) : (
                    <><Plus className="h-3 w-3 mr-1" />Add</>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
