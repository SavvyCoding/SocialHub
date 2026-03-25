"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { PostComposer } from "@/components/feed/PostComposer"

interface ComposeModalProps {
  open: boolean
  onClose: () => void
}

export function ComposeModal({ open, onClose }: ComposeModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-start md:justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Sheet on mobile, top-centered card on desktop */}
      <div className="
        w-full rounded-t-2xl bg-background shadow-2xl
        md:rounded-2xl md:mt-16 md:max-w-xl md:mx-4
        animate-in slide-in-from-bottom duration-300
        md:animate-in md:fade-in md:zoom-in-95
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-muted-foreground">New Post</span>
          {/* spacer */}
          <div className="w-8" />
        </div>

        {/* Composer — pass onPostCreated to auto-close on success */}
        <div className="px-2 pb-4">
          <PostComposer onPostCreated={onClose} />
        </div>
      </div>
    </div>
  )
}
