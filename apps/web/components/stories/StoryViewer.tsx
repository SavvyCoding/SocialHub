"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { formatRelativeTime } from "@/lib/utils"

interface Story {
  id: string
  mediaUrl: string
  mediaType: string
  caption: string | null
  createdAt: Date | string
}

interface StoryGroup {
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  stories: Story[]
  hasUnseen: boolean
}

interface StoryViewerProps {
  group: StoryGroup
  onClose: () => void
}

const STORY_DURATION = 5000

export function StoryViewer({ group, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  const markViewed = trpc.story.markViewed.useMutation()
  const current = group.stories[currentIndex]

  const goNext = useCallback(() => {
    if (currentIndex < group.stories.length - 1) {
      setCurrentIndex((i) => i + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentIndex, group.stories.length, onClose])

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setProgress(0)
    }
  }

  // Auto-advance timer
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext()
          return 0
        }
        return p + 100 / (STORY_DURATION / 100)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [currentIndex, goNext])

  // Mark story viewed
  useEffect(() => {
    if (current) {
      markViewed.mutate({ storyId: current.id })
    }
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose, goNext])

  if (!current) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black md:bg-black/90">
      <div className="relative w-full h-full md:max-w-sm md:mx-auto md:h-[80vh] md:rounded-xl overflow-hidden bg-black">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-none"
                style={{
                  width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-2 right-2 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden relative">
              {group.author.avatarUrl && (
                <Image src={group.author.avatarUrl} alt={group.author.name} fill className="object-cover" sizes="32px" />
              )}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{group.author.username}</p>
              <p className="text-white/70 text-xs">{formatRelativeTime(current.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-white/70">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Media */}
        <div className="relative h-full w-full">
          {current.mediaType === "VIDEO" ? (
            <video
              src={current.mediaUrl}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              loop
            />
          ) : (
            <Image
              src={current.mediaUrl}
              alt="Story"
              fill
              className="object-cover"
              sizes="384px"
              priority
            />
          )}
        </div>

        {/* Caption */}
        {current.caption && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <p className="text-white text-sm bg-black/50 rounded-lg px-3 py-2">{current.caption}</p>
          </div>
        )}

        {/* Navigation areas */}
        <button
          className="absolute left-0 top-0 h-full w-1/3 z-10"
          onClick={goPrev}
          aria-label="Previous story"
        />
        <button
          className="absolute right-0 top-0 h-full w-1/3 z-10"
          onClick={goNext}
          aria-label="Next story"
        />

        {/* Nav icons (visible on wider views) */}
        {currentIndex > 0 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <ChevronLeft className="h-6 w-6 text-white/70" />
          </div>
        )}
        {currentIndex < group.stories.length - 1 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <ChevronRight className="h-6 w-6 text-white/70" />
          </div>
        )}
      </div>
    </div>
  )
}
