"use client"

import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { GoalList } from "@/components/showcase/goals/GoalList"
import { Skeleton } from "@/components/ui/skeleton"

interface GoalsClientProps {
  username: string
}

export function GoalsClient({ username }: GoalsClientProps) {
  const { data: session } = useSession()
  const { data: user, isLoading } = trpc.user.getByUsername.useQuery({ username })

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  if (!user) {
    return <p className="text-center text-muted-foreground py-12">User not found.</p>
  }

  const isOwner = session?.user?.id === user.id

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold">
        🎯 {isOwner ? "My Goals" : `${user.name}'s Goals`}
      </h1>
      <GoalList userId={user.id} isOwner={isOwner} />
    </div>
  )
}
