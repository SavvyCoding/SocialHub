"use client"

import { useState, memo } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { formatRelativeTime } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { CommentComposer } from "./CommentComposer"

export interface CommentData {
  id: string
  content: string
  createdAt: Date | string
  postId: string
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  _count: { likes: number; replies: number }
  isLiked: boolean
}

interface CommentCardProps {
  comment: CommentData
  onDeleted: (id: string) => void
}

export const CommentCard = memo(function CommentCard({ comment, onDeleted }: CommentCardProps) {
  const { data: session } = useSession()
  const [isLiked, setIsLiked] = useState(comment.isLiked)
  const [likeCount, setLikeCount] = useState(comment._count.likes)
  const [showReplies, setShowReplies] = useState(false)
  const [showReplyComposer, setShowReplyComposer] = useState(false)
  const [replyCount, setReplyCount] = useState(comment._count.replies)

  const utils = trpc.useUtils()

  const toggleLike = trpc.post.toggleCommentLike.useMutation({
    onMutate: () => {
      setIsLiked((p) => !p)
      setLikeCount((p) => (isLiked ? p - 1 : p + 1))
    },
    onError: () => {
      setIsLiked((p) => !p)
      setLikeCount((p) => (isLiked ? p + 1 : p - 1))
    },
  })

  const deleteComment = trpc.post.deleteComment.useMutation({
    onSuccess: () => {
      utils.post.getComments.invalidate({ postId: comment.postId })
      utils.post.getById.invalidate({ id: comment.postId })
      onDeleted(comment.id)
    },
  })

  const isOwner = session?.user?.id === comment.author.id

  return (
    <div className="flex gap-2.5">
      <Link href={`/profile/${comment.author.username}`} className="shrink-0 mt-0.5">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatarUrl ?? ""} alt={comment.author.name} />
          <AvatarFallback className="text-xs">{comment.author.name[0].toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="bg-muted rounded-2xl px-3 py-2 inline-block max-w-full">
          <Link
            href={`/profile/${comment.author.username}`}
            className="text-xs font-semibold hover:underline"
          >
            {comment.author.name}
          </Link>
          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3 mt-1 ml-1 flex-wrap">
          <span className="text-[11px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>

          <button
            className={`text-[11px] font-medium ${isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => session && toggleLike.mutate({ commentId: comment.id })}
            disabled={!session}
          >
            {isLiked ? "Liked" : "Like"}{likeCount > 0 ? ` · ${likeCount}` : ""}
          </button>

          {session && (
            <button
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowReplyComposer((p) => !p)}
            >
              Reply
            </button>
          )}

          {isOwner && (
            <button
              className="text-[11px] font-medium text-muted-foreground hover:text-destructive"
              onClick={() => deleteComment.mutate({ commentId: comment.id })}
              disabled={deleteComment.isPending}
            >
              Delete
            </button>
          )}
        </div>

        {/* Replies toggle */}
        {replyCount > 0 && (
          <button
            className="flex items-center gap-1 mt-1 ml-1 text-[11px] font-medium text-primary hover:text-primary/80"
            onClick={() => setShowReplies((p) => !p)}
          >
            {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        )}

        {/* Inline reply composer */}
        {showReplyComposer && (
          <div className="mt-2">
            <CommentComposer
              postId={comment.postId}
              parentId={comment.id}
              placeholder={`Reply to ${comment.author.name}…`}
              onSuccess={() => {
                setReplyCount((p) => p + 1)
                setShowReplies(true)
                setShowReplyComposer(false)
              }}
              compact
            />
          </div>
        )}

        {/* Nested replies */}
        {showReplies && (
          <div className="mt-2 space-y-3 pl-2 border-l-2 border-muted">
            <RepliesList postId={comment.postId} parentId={comment.id} />
          </div>
        )}
      </div>
    </div>
  )
})

// ─── Nested replies ───────────────────────────────────────────────────────────

function RepliesList({ postId, parentId }: { postId: string; parentId: string }) {
  const { data, isLoading } = trpc.post.getComments.useQuery({ postId, parentId })

  if (isLoading) return null

  return (
    <>
      {(data?.comments ?? []).map((reply) => (
        <CommentCard
          key={reply.id}
          comment={{ ...reply, postId }}
          onDeleted={() => {}}
        />
      ))}
    </>
  )
}
