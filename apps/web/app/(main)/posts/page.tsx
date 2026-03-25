"use client"

import { useState } from "react"
import { PostComposer } from "@/components/feed/PostComposer"
import { FeedList } from "@/components/feed/FeedList"
import { ForYouFeedList } from "@/components/feed/ForYouFeedList"
import { StoryRing } from "@/components/stories/StoryRing"
import { cn } from "@/lib/utils"

type Tab = "following" | "for-you"

const TABS: { key: Tab; label: string }[] = [
  { key: "following", label: "Following" },
  { key: "for-you", label: "For You" },
]

export default function PostsPage() {
  const [tab, setTab] = useState<Tab>("following")

  return (
    <div className="space-y-0">
      {/* Stories row */}
      <div className="border-b py-3 px-4">
        <StoryRing />
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-12 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                tab === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Composer — always visible */}
      <div className="border-b">
        <PostComposer />
      </div>

      {/* Feed */}
      <div className="pt-3 space-y-3">
        {tab === "following" ? <FeedList /> : <ForYouFeedList />}
      </div>
    </div>
  )
}
