"use client"

import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { BookShelf } from "@/components/showcase/books/BookShelf"

interface BooksClientProps {
  username: string
}

export function BooksClient({ username }: BooksClientProps) {
  const { data: session } = useSession()
  const { data: user, isLoading } = trpc.user.getByUsername.useQuery({ username })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <p className="text-center text-muted-foreground py-12">User not found.</p>
  }

  const isOwner = session?.user?.id === user.id

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📚 {isOwner ? "My Books" : `${user.name}'s Books`}</h1>
      </div>
      <BookShelf userId={user.id} isOwner={isOwner} />
    </div>
  )
}
