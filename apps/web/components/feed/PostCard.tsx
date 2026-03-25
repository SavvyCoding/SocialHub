"use client"

import { useState, memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Trash2, Bookmark, BadgeCheck, Eye, Pin } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { formatRelativeTime } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { cn } from "@/lib/utils"

interface PostAuthor {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  isVerified: boolean
}

interface PostCount {
  likes: number
  comments: number
  shares: number
}

interface Post {
  id: string
  content: string | null
  mediaUrls: string[]
  createdAt: Date | string
  author: PostAuthor
  _count: PostCount
  isLiked: boolean
  isShared: boolean
  isBookmarked?: boolean
  viewCount?: number
  isPinned?: boolean
  parentPost: {
    id: string
    author: { id: string; name: string; username: string }
  } | null
}

interface PostCardProps {
  post: Post
  style?: React.CSSProperties
}

export const PostCard = memo(function PostCard({ post, style }: PostCardProps) {
  const { data: session } = useSession()
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post._count.likes)
  const [isShared, setIsShared] = useState(post.isShared)
  const [shareCount, setShareCount] = useState(post._count.shares)
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false)
  const [showMenu, setShowMenu] = useState(false)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false)

  const utils = trpc.useUtils()

  const toggleLike = trpc.post.toggleLike.useMutation({
    onMutate: () => {
      if (!isLiked) setLikeAnimating(true)
      setIsLiked((prev) => !prev)
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1))
    },
    onError: () => {
      setIsLiked((prev) => !prev)
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1))
    },
  })

  const toggleShare = trpc.post.toggleShare.useMutation({
    onMutate: () => {
      setIsShared((prev) => !prev)
      setShareCount((prev) => (isShared ? prev - 1 : prev + 1))
    },
    onError: () => {
      setIsShared((prev) => !prev)
      setShareCount((prev) => (isShared ? prev + 1 : prev - 1))
    },
  })

  const toggleBookmark = trpc.post.toggleBookmark.useMutation({
    onMutate: () => {
      if (!isBookmarked) setBookmarkAnimating(true)
      setIsBookmarked((prev) => !prev)
    },
    onError: () => setIsBookmarked((prev) => !prev),
    onSuccess: () => utils.post.getBookmarks.invalidate(),
  })

  const deletePost = trpc.post.delete.useMutation({
    onSuccess: () => {
      utils.post.getFeed.invalidate()
      utils.post.getExploreFeed.invalidate()
    },
  })

  const pinPost = trpc.post.togglePin.useMutation({
    onSuccess: () => {
      utils.post.getByUser.invalidate()
    },
  })

  const isOwner = session?.user?.id === post.author.id

  return (
    <article className="px-4 py-3 space-y-2.5 animate-fade-in-up" style={style}>
      {/* Pinned label */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mb-1">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
      {/* Replying-to label */}
      {post.parentPost && (
        <p className="text-xs text-muted-foreground">
          Replying to{" "}
          <Link
            href={`/profile/${post.parentPost.author.username}`}
            className="text-primary hover:underline"
          >
            @{post.parentPost.author.username}
          </Link>
        </p>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatarUrl ?? ""} alt={post.author.name} />
              <AvatarFallback>{post.author.name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link
              href={`/profile/${post.author.username}`}
              className="font-semibold text-sm hover:underline flex items-center gap-1"
            >
              {post.author.name}
              {post.author.isVerified && (
                <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </Link>
            <p className="text-xs text-muted-foreground">
              @{post.author.username} · {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setShowMenu((prev) => !prev)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 rounded-lg border bg-popover shadow-md min-w-[140px]">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-t-lg"
                  onClick={() => {
                    setShowMenu(false)
                    pinPost.mutate({ postId: post.id })
                  }}
                >
                  <Pin className="h-4 w-4" />
                  {post.isPinned ? "Unpin" : "Pin to profile"}
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent rounded-b-lg"
                  onClick={() => {
                    setShowMenu(false)
                    deletePost.mutate({ id: post.id })
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Media grid */}
      {post.mediaUrls.length > 0 && (
        <div className={`grid gap-2 rounded-xl overflow-hidden ${post.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.mediaUrls.map((url, i) => (
            <div key={i} className="relative aspect-video bg-muted">
              <Image src={url} alt={`Post image ${i + 1}`} fill className="object-cover" sizes="600px" />
            </div>
          ))}
        </div>
      )}

      {/* Actions — evenly spaced */}
      <div className="flex items-center justify-between pt-1 -mx-2">
        {/* Like */}
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-red-500/10 active:scale-95",
            isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
          )}
          onClick={() => toggleLike.mutate({ postId: post.id })}
          disabled={!session}
        >
          <Heart
            className={cn(
              "h-[18px] w-[18px]",
              isLiked && "fill-current",
              likeAnimating && "animate-like-bounce"
            )}
            onAnimationEnd={() => setLikeAnimating(false)}
          />
          <span className="text-xs tabular-nums">{likeCount > 0 ? likeCount : ""}</span>
        </button>

        {/* Comments */}
        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          <span className="text-xs tabular-nums">{post._count.comments > 0 ? post._count.comments : ""}</span>
        </Link>

        {/* Share / Retweet */}
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-green-500/10 active:scale-95",
            isShared ? "text-green-500" : "text-muted-foreground hover:text-green-500"
          )}
          onClick={() => session && toggleShare.mutate({ postId: post.id })}
          disabled={!session}
        >
          <Repeat2 className={cn("h-[18px] w-[18px]", isShared && "fill-current")} />
          <span className="text-xs tabular-nums">{shareCount > 0 ? shareCount : ""}</span>
        </button>

        {/* Bookmark */}
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-primary/10 active:scale-95",
            isBookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"
          )}
          onClick={() => session && toggleBookmark.mutate({ postId: post.id })}
          disabled={!session}
          title={isBookmarked ? "Remove bookmark" : "Bookmark"}
        >
          <Bookmark
            className={cn(
              "h-[18px] w-[18px]",
              isBookmarked && "fill-current",
              bookmarkAnimating && "animate-like-bounce"
            )}
            onAnimationEnd={() => setBookmarkAnimating(false)}
          />
        </button>

        {/* View count */}
        {post.viewCount != null && post.viewCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Eye className="h-3.5 w-3.5" />
            {post.viewCount}
          </span>
        )}
      </div>
    </article>
  )
})
