"use client"

import { useState, useRef } from "react"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { Button } from "@/components/ui/button"

interface CommentComposerProps {
  postId: string
  parentId?: string
  placeholder?: string
  onSuccess?: () => void
  compact?: boolean
}

export function CommentComposer({
  postId,
  parentId,
  placeholder = "Write a comment…",
  onSuccess,
  compact = false,
}: CommentComposerProps) {
  const { data: session } = useSession()
  const [content, setContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const utils = trpc.useUtils()

  const addComment = trpc.post.addComment.useMutation({
    onSuccess: () => {
      setContent("")
      if (textareaRef.current) textareaRef.current.style.height = "auto"
      // Invalidate the relevant comment list so it re-fetches
      utils.post.getComments.invalidate({ postId, parentId: parentId ?? null })
      // Also bump the post comment count
      utils.post.getById.invalidate({ id: postId })
      onSuccess?.()
    },
  })

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  const submit = () => {
    if (!content.trim()) return
    addComment.mutate({ postId, content: content.trim(), parentId })
  }

  if (!session) return null

  return (
    <div className={`flex gap-2 ${compact ? "" : "items-start"}`}>
      {!compact && (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarImage src={session.user?.image ?? ""} alt={session.user?.name ?? ""} />
          <AvatarFallback className="text-xs">{session.user?.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 flex items-end gap-2 bg-muted rounded-2xl px-3 py-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={500}
          className="flex-1 bg-transparent text-sm resize-none outline-none min-h-[20px] max-h-[120px] overflow-y-auto placeholder:text-muted-foreground leading-5"
        />
        <Button
          size="sm"
          className="shrink-0 h-7 px-3 text-xs rounded-xl"
          disabled={!content.trim() || addComment.isPending}
          onClick={submit}
        >
          {addComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post"}
        </Button>
      </div>
    </div>
  )
}
