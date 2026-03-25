"use client"

import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { PlacesShowcase } from "@/components/showcase/places/PlacesShowcase"
import { Skeleton } from "@/components/ui/skeleton"

interface PlacesClientProps {
  username: string
}

export function PlacesClient({ username }: PlacesClientProps) {
  const { data: session } = useSession()
  const { data: user, isLoading } = trpc.user.getByUsername.useQuery({ username })

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
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
        🗺️ {isOwner ? "My Places" : `${user.name}'s Places`}
      </h1>
      <PlacesShowcase userId={user.id} isOwner={isOwner} />
    </div>
  )
}
