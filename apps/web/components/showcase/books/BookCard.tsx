"use client"

import { useState, memo } from "react"
import Image from "next/image"
import { Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { StarRating } from "./StarRating"

const STATUS_LABELS: Record<string, string> = {
  WANT_TO_READ: "Want to Read",
  READING: "Reading",
  READ: "Read",
  DID_NOT_FINISH: "Did Not Finish",
}

const STATUS_COLORS: Record<string, string> = {
  WANT_TO_READ: "bg-muted text-muted-foreground",
  READING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  READ: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  DID_NOT_FINISH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
}

interface BookEntry {
  id: string
  title: string
  author: string | null
  coverUrl: string | null
  publishYear: number | null
  status: string
  rating: number | null
  review: string | null
  startedAt: Date | string | null
  finishedAt: Date | string | null
}

interface BookCardProps {
  entry: BookEntry
  isOwner: boolean
  userId: string
}

export const BookCard = memo(function BookCard({ entry, isOwner, userId }: BookCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editRating, setEditRating] = useState(entry.rating)
  const [editReview, setEditReview] = useState(entry.review ?? "")
  const [editStatus, setEditStatus] = useState(entry.status)
  const [dirty, setDirty] = useState(false)

  const utils = trpc.useUtils()
  const invalidate = () => {
    utils.book.getShelf.invalidate({ userId })
    utils.book.getStats.invalidate({ userId })
  }

  const update = trpc.book.updateBook.useMutation({ onSuccess: () => { invalidate(); setDirty(false) } })
  const remove = trpc.book.removeBook.useMutation({ onSuccess: invalidate })

  const coverSrc = entry.coverUrl

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      {/* Cover */}
      <div className="flex-shrink-0 w-[52px] h-[78px] rounded overflow-hidden bg-muted relative">
        {coverSrc ? (
          <Image src={coverSrc} alt={entry.title} fill className="object-cover" sizes="52px" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground text-center p-1 leading-tight">
            {entry.title.slice(0, 20)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate">{entry.title}</p>
            {entry.author && <p className="text-xs text-muted-foreground truncate">{entry.author}</p>}
            {entry.publishYear && <p className="text-xs text-muted-foreground">{entry.publishYear}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[editStatus]}`}>
              {STATUS_LABELS[editStatus]}
            </span>
            {isOwner && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="p-1 rounded hover:bg-accent text-muted-foreground"
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Star rating (read-only preview) */}
        {entry.rating && !expanded && (
          <StarRating value={entry.rating} readonly />
        )}

        {/* Review snippet */}
        {entry.review && !expanded && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">&ldquo;{entry.review}&rdquo;</p>
        )}

        {/* Edit panel (owner only) */}
        {isOwner && expanded && (
          <div className="space-y-2 pt-1 border-t mt-2">
            {/* Status picker */}
            <select
              value={editStatus}
              onChange={(e) => { setEditStatus(e.target.value); setDirty(true) }}
              className="text-xs px-2 py-1 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {/* Star rating */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rating:</span>
              <StarRating
                value={editRating}
                onChange={(v) => { setEditRating(v); setDirty(true) }}
                size="md"
              />
              {editRating && (
                <button
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => { setEditRating(null); setDirty(true) }}
                >
                  clear
                </button>
              )}
            </div>

            {/* Review */}
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
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => update.mutate({
                    id: entry.id,
                    status: editStatus as never,
                    rating: editRating,
                    review: editReview || null,
                  })}
                  disabled={update.isPending}
                >
                  Save
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => remove.mutate({ id: entry.id })}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        )}

        {/* Read-only review (non-owner) */}
        {!isOwner && entry.review && (
          <p className="text-xs text-muted-foreground italic mt-1">&ldquo;{entry.review}&rdquo;</p>
        )}
      </div>
    </div>
  )
})
