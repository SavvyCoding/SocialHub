"use client"

import { useState } from "react"
import Image from "next/image"
import { Plus } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { StoryViewer } from "./StoryViewer"
import { StoryUploader } from "./StoryUploader"

interface StoryGroup {
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  stories: {
    id: string
    mediaUrl: string
    mediaType: string
    caption: string | null
    createdAt: Date | string
  }[]
  hasUnseen: boolean
}

export function StoryRing() {
  const { data: session } = useSession()
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null)
  const [showUploader, setShowUploader] = useState(false)

  const { data: storyGroups } = trpc.story.getActiveForFeed.useQuery(undefined, {
    refetchInterval: 60_000,
  })

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add story button */}
        {session && (
          <button
            onClick={() => setShowUploader(true)}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="relative h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground truncate w-14 text-center">Your story</span>
          </button>
        )}

        {/* Story rings */}
        {storyGroups?.map((group) => (
          <button
            key={group.author.id}
            onClick={() => setViewingGroup(group as StoryGroup)}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div
              className={`h-14 w-14 rounded-full p-0.5 ${
                group.hasUnseen
                  ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                  : "bg-muted"
              }`}
            >
              <div className="h-full w-full rounded-full bg-background p-0.5">
                <div className="relative h-full w-full rounded-full overflow-hidden bg-muted">
                  {group.author.avatarUrl ? (
                    <Image
                      src={group.author.avatarUrl}
                      alt={group.author.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-medium">
                      {group.author.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs truncate w-14 text-center">
              {group.author.username}
            </span>
          </button>
        ))}
      </div>

      {viewingGroup && (
        <StoryViewer group={viewingGroup} onClose={() => setViewingGroup(null)} />
      )}

      {showUploader && (
        <StoryUploader onClose={() => setShowUploader(false)} />
      )}
    </>
  )
}
