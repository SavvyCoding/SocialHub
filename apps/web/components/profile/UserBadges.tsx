"use client"

import { trpc } from "@/lib/trpc/client"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const BADGE_META: Record<string, { label: string; emoji: string; description: string }> = {
  EARLY_ADOPTER: {
    label: "Early Adopter",
    emoji: "🚀",
    description: "Joined the platform in its early days",
  },
  POWER_USER: {
    label: "Power User",
    emoji: "⚡",
    description: "Highly active member of the community",
  },
  TOP_CONTRIBUTOR: {
    label: "Top Contributor",
    emoji: "🏆",
    description: "Outstanding contributions to the platform",
  },
}

interface UserBadgesProps {
  userId: string
}

export function UserBadges({ userId }: UserBadgesProps) {
  const { data: badges, isLoading } = trpc.user.getBadges.useQuery({ userId })

  if (isLoading || !badges || badges.length === 0) return null

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1.5" data-testid="user-badges">
        {badges.map((badge) => {
          const meta = BADGE_META[badge.badgeType]
          if (!meta) return null
          return (
            <Tooltip key={badge.badgeType}>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-default select-none gap-1 text-xs">
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{meta.description}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
