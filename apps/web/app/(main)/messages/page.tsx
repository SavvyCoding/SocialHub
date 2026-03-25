"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MessageSquare, Search } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { formatRelativeTime } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ConversationSkeleton } from "@/components/ui/skeleton"

export default function MessagesPage() {
  const router = useRouter()
  const [searchQ, setSearchQ] = useState("")

  const { data: convData, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = trpc.message.getConversations.useInfiniteQuery(
    {},
    { getNextPageParam: (last) => last.nextCursor, refetchInterval: 10_000 }
  )
  const conversations = convData?.pages?.flatMap((p) => p.conversations ?? []) ?? []

  const searchUsers = trpc.user.search.useQuery(
    { q: searchQ, limit: 6 },
    { enabled: searchQ.trim().length > 0 }
  )

  const getOrCreate = trpc.message.getOrCreate.useMutation({
    onSuccess: (data) => router.push(`/messages/${data.id}`),
  })

  return (
    <div className="space-y-0 rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h1 className="text-lg font-bold">Messages</h1>
        <div className="mt-2 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people to message…"
            className="pl-8 h-9"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>

        {/* User search results */}
        {searchQ.trim().length > 0 && (
          <div className="mt-1 border rounded-lg bg-popover shadow-md overflow-hidden">
            {searchUsers.isLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : searchUsers.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No users found</p>
            ) : (
              searchUsers.data?.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                  onClick={() => {
                    setSearchQ("")
                    getOrCreate.mutate({ userId: user.id })
                  }}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user.avatarUrl ?? ""} alt={user.name} />
                    <AvatarFallback>{user.name[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Conversation list */}
      {isLoading ? (
        <div className="divide-y">
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-medium">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">Search for someone to start a conversation</p>
          </div>
        </div>
      ) : (
        <div className="divide-y">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={conv.other.avatarUrl ?? ""} alt={conv.other.name} />
                <AvatarFallback>{conv.other.name[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{conv.other.name}</p>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeTime(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {conv.lastMessage?.content ?? "No messages yet"}
                </p>
              </div>
            </Link>
          ))}
          {hasNextPage && (
            <div className="flex justify-center py-3">
              <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-primary">
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
