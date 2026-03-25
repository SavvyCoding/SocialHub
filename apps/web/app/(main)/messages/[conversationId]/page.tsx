"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, Loader2, Send } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { formatRelativeTime } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params)
  const { data: session } = useSession()
  const [text, setText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.message.getMessages.useQuery(
    { conversationId },
    { refetchInterval: 3_000 }
  )

  const { data: convData } = trpc.message.getConversations.useInfiniteQuery(
    {},
    { getNextPageParam: (last) => last.nextCursor }
  )
  const conv = convData?.pages?.flatMap((p) => p.conversations ?? []).find((c) => c.id === conversationId)

  const send = trpc.message.send.useMutation({
    onSuccess: () => {
      setText("")
      utils.message.getMessages.invalidate({ conversationId })
      utils.message.getConversations.invalidate()
    },
  })

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [data?.messages.length])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || send.isPending) return
    send.mutate({ conversationId, content: trimmed })
  }

  const messages = data?.messages ?? []

  // Index of the last outgoing message that has been read by the recipient
  const lastReadOutgoingIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === session?.user?.id && messages[i].isRead) return i
    }
    return -1
  })()

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Link href="/messages" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {conv ? (
          <>
            <Avatar className="h-8 w-8">
              <AvatarImage src={conv.other.avatarUrl ?? ""} alt={conv.other.name} />
              <AvatarFallback>{conv.other.name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <Link href={`/profile/${conv.other.username}`} className="hover:underline">
              <p className="text-sm font-semibold">{conv.other.name}</p>
              <p className="text-xs text-muted-foreground">@{conv.other.username}</p>
            </Link>
          </>
        ) : (
          <p className="text-sm font-semibold">Conversation</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === session?.user?.id
            return (
              <div key={msg.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Avatar className="h-7 w-7 shrink-0 mt-1">
                    <AvatarImage src={msg.sender.avatarUrl ?? ""} alt={msg.sender.name} />
                    <AvatarFallback className="text-[10px]">{msg.sender.name[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[70%]", isMe ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {formatRelativeTime(msg.createdAt)}
                  </span>
                  {isMe && idx === lastReadOutgoingIdx && (
                    <span className="text-[10px] text-primary px-1">Seen</span>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-28 leading-5"
            placeholder="Write a message…"
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value)
              e.target.style.height = "auto"
              e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            size="icon"
            className="rounded-full h-9 w-9 shrink-0"
            disabled={!text.trim() || send.isPending}
            onClick={handleSend}
          >
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
