"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { BadgeCheck } from "lucide-react"
import { FollowButton } from "./FollowButton"
import { useSession } from "next-auth/react"

interface UserCardProps {
  user: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    bio: string | null
    isVerified: boolean
    _count?: { receivedFollows: number }
  }
  showFollowButton?: boolean
}

export function UserCard({ user, showFollowButton = true }: UserCardProps) {
  const { data: session } = useSession()
  const isCurrentUser = session?.user?.id === user.id
  const [showPreview, setShowPreview] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShowPreview(true), 400)
  }
  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShowPreview(false)
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
        <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" sizes="40px" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-medium">
                {user.name[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              {user.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            {user._count && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {user._count.receivedFollows.toLocaleString()} followers
              </p>
            )}
          </div>
        </Link>
        {showFollowButton && !isCurrentUser && (
          <FollowButton userId={user.id} />
        )}
      </div>

      {/* Hover preview popover */}
      {showPreview && (
        <div className="absolute left-0 top-full z-50 w-64 rounded-xl border bg-card shadow-xl p-4 space-y-2 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-muted">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" sizes="48px" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-base font-medium">
                  {user.name[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                {user.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          {user.bio && (
            <p className="text-xs text-muted-foreground line-clamp-2">{user.bio}</p>
          )}
          {user._count && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {user._count.receivedFollows.toLocaleString()} followers
            </p>
          )}
          {showFollowButton && !isCurrentUser && (
            <div className="pt-1">
              <FollowButton userId={user.id} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
