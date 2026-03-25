"use client"

import { useState } from "react"
import { MapPin, Plus, Loader2, Globe } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { TravelMap } from "./TravelMap"
import { PlaceCard } from "./PlaceCard"
import { AddPlaceModal } from "./AddPlaceModal"
import { Button } from "@/components/ui/button"

interface PlacesShowcaseProps {
  userId: string
  isOwner: boolean
}

export function PlacesShowcase({ userId, isOwner }: PlacesShowcaseProps) {
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = trpc.place.getPlaces.useInfiniteQuery(
    { userId },
    { getNextPageParam: (last) => last.nextCursor }
  )
  const places = data?.pages?.flatMap((p) => p.entries ?? []) ?? []
  const { data: stats } = trpc.place.getStats.useQuery({ userId })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="font-bold">{stats.total}</span>
          <span className="text-muted-foreground">{stats.total === 1 ? "place" : "places"}</span>
          {stats.countries > 0 && (
            <>
              <Globe className="h-4 w-4 text-muted-foreground self-center" />
              <span className="font-bold">{stats.countries}</span>
              <span className="text-muted-foreground">{stats.countries === 1 ? "country" : "countries"}</span>
            </>
          )}
        </div>
      )}

      {/* Map */}
      {places.length > 0 && <TravelMap places={places} />}

      {/* Add button (owner only) */}
      {isOwner && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add a place
        </button>
      )}

      {/* Place list */}
      {places.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {isOwner ? "No places yet. Start adding places you've visited!" : "No places added yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} isOwner={isOwner} userId={userId} />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-primary">
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      {showAdd && <AddPlaceModal userId={userId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
