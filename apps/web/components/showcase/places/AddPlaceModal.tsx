"use client"

import { useState, useCallback } from "react"
import { X, Search, MapPin, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useDebounce } from "@/hooks/useDebounce"

interface GeoResult {
  id: string
  name: string
  fullName: string
  longitude: number
  latitude: number
  country: string
  city?: string
}

interface AddPlaceModalProps {
  userId: string
  onClose: () => void
}

export function AddPlaceModal({ userId, onClose }: AddPlaceModalProps) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<GeoResult | null>(null)
  const [visitedAt, setVisitedAt] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const debouncedQuery = useDebounce(query, 400)
  const utils = trpc.useUtils()

  const { data: results, isLoading: searching } = trpc.place.geocode.useQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 && !selected }
  )

  const addPlace = trpc.place.addPlace.useMutation({
    onSuccess: () => {
      utils.place.getPlaces.invalidate({ userId })
      utils.place.getStats.invalidate({ userId })
      onClose()
    },
    onError: () => setSaving(false),
  })

  const handleSelect = useCallback((r: GeoResult) => {
    setSelected(r)
    setQuery(r.fullName)
  }, [])

  const handleSubmit = () => {
    if (!selected) return
    setSaving(true)
    addPlace.mutate({
      name: selected.name,
      country: selected.country || selected.fullName,
      city: selected.city,
      latitude: selected.latitude,
      longitude: selected.longitude,
      visitedAt: visitedAt || undefined,
      notes: notes || undefined,
    })
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Add a Place</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Search / manual entry */}
          {!token ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Place Name</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Kyoto, Japan"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Mapbox token not set — enter place name manually. Coordinates will default to 0,0.
              </p>
            </div>
          ) : (
            <div className="space-y-1 relative">
              <label className="text-xs text-muted-foreground font-medium">Search for a place</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelected(null)
                  }}
                  placeholder="Search city, country, or landmark…"
                  className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Suggestions */}
              {!selected && results && results.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
                  {results.map((r: GeoResult) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{r.fullName}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected badge */}
              {selected && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <MapPin className="h-3 w-3" />
                  <span>{selected.fullName}</span>
                  <button
                    onClick={() => { setSelected(null); setQuery("") }}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Date visited */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Date Visited (optional)</label>
            <input
              type="month"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value ? `${e.target.value}-01` : "")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Memories, tips, favorite spots…"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || (!selected && !query.trim())}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {saving ? "Adding…" : "Add Place"}
          </button>
        </div>
      </div>
    </div>
  )
}
