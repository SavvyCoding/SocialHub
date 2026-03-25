"use client"

import Link from "next/link"
import { Activity, Heart, FileText } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { formatRelativeTime } from "@/lib/utils"
import { BadgeCheck } from "lucide-react"

export function LiveActivityFeed() {
  const { data: activities, isLoading } = trpc.post.getRecentActivity.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  if (isLoading || !activities?.length) return null

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Live Activity</h3>
        <span className="flex h-2 w-2 ml-auto">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      </div>

      <div className="space-y-2">
        {activities.slice(0, 5).map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <Link href={`/profile/${item.actorUsername}`}>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={item.actorAvatar ?? ""} alt={item.actorName} />
                <AvatarFallback className="text-[10px]">{item.actorName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug">
                <Link
                  href={`/profile/${item.actorUsername}`}
                  className="font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  {item.actorName}
                  {item.actorVerified && <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />}
                </Link>{" "}
                {item.type === "post" ? (
                  <span className="text-muted-foreground">posted</span>
                ) : (
                  <span className="text-muted-foreground">reacted to a post</span>
                )}
              </p>
              {item.text && (
                <Link href={`/post/${item.postId}`}>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5 hover:text-foreground transition-colors">
                    {item.type === "post" ? (
                      <FileText className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                    ) : (
                      <Heart className="inline h-3 w-3 mr-0.5 -mt-0.5 text-red-400" />
                    )}
                    {item.text}
                  </p>
                </Link>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
