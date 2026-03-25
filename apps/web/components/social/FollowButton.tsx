"use client"

import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface FollowButtonProps {
  userId: string
  initialIsFollowing?: boolean
  size?: "default" | "sm" | "lg"
}

export function FollowButton({ userId, initialIsFollowing = false, size = "sm" }: FollowButtonProps) {
  const utils = trpc.useUtils()

  const { data } = trpc.follow.isFollowing.useQuery(
    { userId },
    { initialData: { following: initialIsFollowing } }
  )
  const isFollowing = data?.following ?? initialIsFollowing

  const follow = trpc.follow.follow.useMutation({
    onSuccess: () => {
      utils.follow.isFollowing.invalidate({ userId })
      utils.user.getByUsername.invalidate()
    },
  })

  const unfollow = trpc.follow.unfollow.useMutation({
    onSuccess: () => {
      utils.follow.isFollowing.invalidate({ userId })
      utils.user.getByUsername.invalidate()
    },
  })

  const isPending = follow.isPending || unfollow.isPending

  const handleClick = () => {
    if (isFollowing) {
      unfollow.mutate({ userId })
    } else {
      follow.mutate({ userId })
    }
  }

  return (
    <Button
      size={size}
      variant={isFollowing ? "outline" : "default"}
      onClick={handleClick}
      disabled={isPending}
      className="min-w-[90px]"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isFollowing ? (
        "Following"
      ) : (
        "Follow"
      )}
    </Button>
  )
}
