"use client"

import { useState, memo } from "react"
import Image from "next/image"
import { Trash2, ChevronDown, ChevronUp, Tv, Film } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { RatingBar } from "./RatingBar"

const STATUS_LABELS: Record<string, string> = {
  WANT_TO_WATCH: "Want to Watch",
  WATCHING: "Watching",
  WATCHED: "Watched",
  DROPPED: "Dropped",
}

const STATUS_COLORS: Record<string, string> = {
  WANT_TO_WATCH: "bg-muted text-muted-foreground",
  WATCHING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  WATCHED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  DROPPED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
}

interface MovieEntry {
  id: string
  title: string
  mediaType: string
  posterUrl: string | null
  releaseYear: number | null
  status: string
  rating: number | null
  review: string | null
  watchedAt: Date | string | null
}

interface MovieCardProps {
  entry: MovieEntry
  isOwner: boolean
  userId: string
}

export const MovieCard = memo(function MovieCard({ entry, isOwner, userId }: MovieCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editRating, setEditRating] = useState(entry.rating)
  const [editReview, setEditReview] = useState(entry.review ?? "")
  const [editStatus, setEditStatus] = useState(entry.status)
  const [dirty, setDirty] = useState(false)

  const utils = trpc.useUtils()
  const invalidate = () => {
    utils.movie.getWatchlist.invalidate({ userId })
    utils.movie.getStats.invalidate({ userId })
  }

  const update = trpc.movie.updateMovie.useMutation({ onSuccess: () => { invalidate(); setDirty(false) } })
  const remove = trpc.movie.removeMovie.useMutation({ onSuccess: invalidate })

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      {/* Poster */}
      <div className="flex-shrink-0 w-[52px] h-[78px] rounded overflow-hidden bg-muted relative">
        {entry.posterUrl ? (
          <Image
            src={entry.posterUrl}
            alt={entry.title}
            fill
            className="object-cover"
            sizes="52px"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            {entry.mediaType === "TV" ? <Tv className="h-5 w-5 text-muted-foreground" /> : <Film className="h-5 w-5 text-muted-foreground" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-sm leading-tight truncate">{entry.title}</p>
              <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-0.5">
                {entry.mediaType === "TV" ? <Tv className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                {entry.mediaType === "TV" ? "TV" : "Film"}
              </span>
            </div>
            {entry.releaseYear && <p className="text-xs text-muted-foreground">{entry.releaseYear}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[editStatus]}`}>
              {STATUS_LABELS[editStatus]}
            </span>
            {isOwner && (
              <button onClick={() => setExpanded((e) => !e)} className="p-1 rounded hover:bg-accent text-muted-foreground">
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Rating preview */}
        {entry.rating && !expanded && (
          <RatingBar value={entry.rating} readonly />
        )}

        {/* Review snippet */}
        {entry.review && !expanded && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">&ldquo;{entry.review}&rdquo;</p>
        )}

        {/* Edit panel */}
        {isOwner && expanded && (
          <div className="space-y-2 pt-1 border-t mt-2">
            <select
              value={editStatus}
              onChange={(e) => { setEditStatus(e.target.value); setDirty(true) }}
              className="text-xs px-2 py-1 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rating:</span>
              <RatingBar
                value={editRating}
                onChange={(v) => { setEditRating(v); setDirty(true) }}
              />
              {editRating && (
                <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => { setEditRating(null); setDirty(true) }}>
                  clear
                </button>
              )}
            </div>

            <textarea
              value={editReview}
              onChange={(e) => { setEditReview(e.target.value); setDirty(true) }}
              placeholder="Write a review..."
              rows={2}
              maxLength={1000}
              className="w-full px-2 py-1.5 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />

            <div className="flex gap-2">
              {dirty && (
                <Button size="sm" className="h-7 text-xs" onClick={() => update.mutate({ id: entry.id, status: editStatus as never, rating: editRating, review: editReview || null })} disabled={update.isPending}>
                  Save
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => remove.mutate({ id: entry.id })} disabled={remove.isPending}>
                <Trash2 className="h-3 w-3 mr-1" />Remove
              </Button>
            </div>
          </div>
        )}

        {!isOwner && entry.review && (
          <p className="text-xs text-muted-foreground italic mt-1">&ldquo;{entry.review}&rdquo;</p>
        )}
      </div>
    </div>
  )
})
