"use client"

import Link from "next/link"
import Image from "next/image"
import { Heart, MessageCircle, UserPlus, AtSign, Share2, Bell } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  FOLLOW: <UserPlus className="h-4 w-4 text-blue-500" />,
  FRIEND_REQUEST: <UserPlus className="h-4 w-4 text-purple-500" />,
  FRIEND_ACCEPTED: <UserPlus className="h-4 w-4 text-green-500" />,
  LIKE_POST: <Heart className="h-4 w-4 text-red-500 fill-red-500" />,
  LIKE_COMMENT: <Heart className="h-4 w-4 text-red-400 fill-red-400" />,
  COMMENT: <MessageCircle className="h-4 w-4 text-green-500" />,
  REPLY: <MessageCircle className="h-4 w-4 text-teal-500" />,
  MENTION_POST: <AtSign className="h-4 w-4 text-orange-500" />,
  MENTION_COMMENT: <AtSign className="h-4 w-4 text-orange-400" />,
  SHARE: <Share2 className="h-4 w-4 text-blue-400" />,
}

const NOTIFICATION_MESSAGES: Record<string, string> = {
  FOLLOW: "started following you",
  FRIEND_REQUEST: "sent you a friend request",
  FRIEND_ACCEPTED: "accepted your friend request",
  LIKE_POST: "liked your post",
  LIKE_COMMENT: "liked your comment",
  COMMENT: "commented on your post",
  REPLY: "replied to your comment",
  MENTION_POST: "mentioned you in a post",
  MENTION_COMMENT: "mentioned you in a comment",
  SHARE: "shared your post",
}

interface NotificationItemProps {
  notification: {
    id: string
    type: string
    isRead: boolean
    createdAt: Date | string
    actor: {
      id: string
      name: string
      username: string
      avatarUrl: string | null
    } | null
    entityType: string | null
    entityId: string | null
  }
  onRead: (id: string) => void
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const { actor, type, isRead, createdAt, entityType, entityId } = notification

  const getLink = () => {
    if (entityType === "post" && entityId) return `/post/${entityId}`
    if (actor) return `/profile/${actor.username}`
    return "#"
  }

  return (
    <Link
      href={getLink()}
      onClick={() => !isRead && onRead(notification.id)}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors",
        !isRead && "bg-primary/5"
      )}
    >
      {/* Actor avatar */}
      <div className="relative flex-shrink-0">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted relative">
          {actor?.avatarUrl ? (
            <Image src={actor.avatarUrl} alt={actor.name} fill className="object-cover" sizes="40px" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm font-medium">
              {actor?.name[0].toUpperCase() ?? "?"}
            </div>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
          {NOTIFICATION_ICONS[type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{actor?.name ?? "Someone"}</span>{" "}
          <span className="text-muted-foreground">{NOTIFICATION_MESSAGES[type] ?? "interacted with you"}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(createdAt)}</p>
      </div>

      {!isRead && (
        <div className="flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-2" />
      )}
    </Link>
  )
}
