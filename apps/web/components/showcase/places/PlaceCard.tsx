"use client"

import { useState } from "react"
import { MapPin, Calendar, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { trpc } from "@/lib/trpc/client"

interface Place {
  id: string
  name: string
  country: string
  city?: string | null
  latitude: number
  longitude: number
  visitedAt?: Date | string | null
  notes?: string | null
}

interface PlaceCardProps {
  place: Place
  isOwner: boolean
  userId: string
}

export function PlaceCard({ place, isOwner, userId }: PlaceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editNotes, setEditNotes] = useState(place.notes ?? "")
  const [saving, setSaving] = useState(false)
  const utils = trpc.useUtils()

  const deletePlace = trpc.place.deletePlace.useMutation({
    onSuccess: () => utils.place.getPlaces.invalidate({ userId }),
  })

  const updatePlace = trpc.place.updatePlace.useMutation({
    onSuccess: () => {
      utils.place.getPlaces.invalidate({ userId })
      setSaving(false)
    },
  })

  const handleSaveNotes = () => {
    setSaving(true)
    updatePlace.mutate({ id: place.id, notes: editNotes })
  }

  const formattedDate = place.visitedAt
    ? new Date(place.visitedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 bg-primary/10 rounded-full p-1.5 flex-shrink-0">
            <MapPin className="h-3 w-3 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight">{place.name}</p>
            <p className="text-xs text-muted-foreground">
              {[place.city, place.country].filter(Boolean).join(", ")}
            </p>
            {formattedDate && (
              <div className="flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{formattedDate}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {place.notes && !isOwner && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={() => deletePlace.mutate({ id: place.id })}
                disabled={deletePlace.isPending}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded notes area */}
      {expanded && (
        <div className="pt-1 border-t">
          {isOwner ? (
            <div className="space-y-2">
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes about this place..."
                rows={3}
                className="w-full text-xs border rounded-md px-2 py-1.5 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSaveNotes}
                disabled={saving || editNotes === place.notes}
                className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {saving ? "Saving…" : "Save notes"}
              </button>
            </div>
          ) : (
            place.notes && <p className="text-xs text-muted-foreground">{place.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
