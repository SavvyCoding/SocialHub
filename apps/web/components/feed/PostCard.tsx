"use client"

import { useState, useRef, memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Trash2, Bookmark, BadgeCheck, Eye, Pin, Clock, Library, Plus, Quote } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { formatRelativeTime } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { cn } from "@/lib/utils"

const REACTION_MAP: Record<string, string> = {
  LIKE: "❤️",
  LOVE: "😍",
  CELEBRATE: "🎉",
  INSIGHTFUL: "💡",
  CURIOUS: "🤔",
}
const REACTION_TYPES = ["LIKE", "LOVE", "CELEBRATE", "INSIGHTFUL", "CURIOUS"] as const
type ReactionType = typeof REACTION_TYPES[number]

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

interface PollOption {
  id: string
  text: string
  order: number
  voteCount: number
}

interface Poll {
  id: string
  question: string
  options: PollOption[]
  votes?: { optionId: string }[]
}

interface QuotedPost {
  id: string
  content: string | null
  mediaUrls: string[]
  author: PostAuthor
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
  reactionType?: string | null
  viewCount?: number
  isPinned?: boolean
  scheduledAt?: Date | string | null
  isPublished?: boolean
  poll?: Poll | null
  originalPost?: QuotedPost | null
  parentPost: {
    id: string
    author: { id: string; name: string; username: string }
  } | null
}

interface PostCardProps {
  post: Post
  style?: React.CSSProperties
}

// ─── Poll display ─────────────────────────────────────────────────────────────

function PollDisplay({ poll, postId }: { poll: Poll; postId: string }) {
  const utils = trpc.useUtils()
  const [voted, setVoted] = useState<string | null>(poll.votes?.[0]?.optionId ?? null)
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(
    Object.fromEntries(poll.options.map((o) => [o.id, o.voteCount]))
  )

  const votePoll = trpc.post.votePoll.useMutation({
    onMutate: ({ optionId }) => {
      setVoted(optionId)
      setLocalCounts((prev) => ({ ...prev, [optionId]: (prev[optionId] ?? 0) + 1 }))
    },
    onError: (_, { optionId }) => {
      setVoted(null)
      setLocalCounts((prev) => ({ ...prev, [optionId]: Math.max(0, (prev[optionId] ?? 0) - 1) }))
    },
    onSuccess: () => utils.post.getFeed.invalidate(),
  })

  const total = Object.values(localCounts).reduce((a, b) => a + b, 0)
  const showResults = voted !== null

  return (
    <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
      <p className="text-sm font-medium">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const count = localCounts[option.id] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const isChosen = voted === option.id

          return showResults ? (
            <div key={option.id} className="relative rounded-lg overflow-hidden">
              <div
                className={cn(
                  "absolute inset-0 rounded-lg transition-all duration-500",
                  isChosen ? "bg-primary/20" : "bg-muted"
                )}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                <span className={cn("font-medium", isChosen && "text-primary")}>{option.text}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
              </div>
            </div>
          ) : (
            <button
              key={option.id}
              className="w-full rounded-lg border px-3 py-2 text-sm text-left hover:bg-accent hover:border-primary transition-colors"
              onClick={() => votePoll.mutate({ pollId: poll.id, optionId: option.id })}
              disabled={votePoll.isPending}
            >
              {option.text}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{total} vote{total !== 1 ? "s" : ""}</p>
    </div>
  )
}

// ─── Reaction picker ──────────────────────────────────────────────────────────

function ReactionButton({
  isLiked,
  likeCount,
  reactionType,
  onReact,
  disabled,
}: {
  isLiked: boolean
  likeCount: number
  reactionType: string | null
  onReact: (type: ReactionType) => void
  disabled: boolean
}) {
  const [showPicker, setShowPicker] = useState(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openPicker = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    showTimer.current = setTimeout(() => setShowPicker(true), 400)
  }
  const closePicker = () => {
    if (showTimer.current) clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setShowPicker(false), 200)
  }

  const currentEmoji = isLiked && reactionType ? REACTION_MAP[reactionType] ?? "❤️" : null
  const currentReaction = isLiked && reactionType ? reactionType : null

  return (
    <div className="relative" onMouseEnter={openPicker} onMouseLeave={closePicker}>
      {/* Reaction picker popup */}
      {showPicker && !disabled && (
        <div
          className="absolute bottom-full left-0 mb-1 z-50 flex items-center gap-1 rounded-full border bg-popover px-2 py-1 shadow-lg"
          onMouseEnter={openPicker}
          onMouseLeave={closePicker}
        >
          {REACTION_TYPES.map((type) => (
            <button
              key={type}
              className={cn(
                "text-lg leading-none p-1 rounded-full transition-transform hover:scale-125",
                currentReaction === type && "ring-2 ring-primary ring-offset-1"
              )}
              title={type.charAt(0) + type.slice(1).toLowerCase()}
              onClick={() => {
                setShowPicker(false)
                onReact(type)
              }}
            >
              {REACTION_MAP[type]}
            </button>
          ))}
        </div>
      )}

      {/* Main like button */}
      <button
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors active:scale-95",
          isLiked ? "text-red-500 hover:bg-red-500/10" : "text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
        )}
        onClick={() => onReact((currentReaction as ReactionType) ?? "LIKE")}
        disabled={disabled}
      >
        {currentEmoji ? (
          <span className="text-base leading-none">{currentEmoji}</span>
        ) : (
          <Heart className="h-[18px] w-[18px]" />
        )}
        <span className="text-xs tabular-nums">{likeCount > 0 ? likeCount : ""}</span>
      </button>
    </div>
  )
}

// ─── Quoted post mini-card ────────────────────────────────────────────────────

function QuotedPostCard({ post }: { post: QuotedPost }) {
  return (
    <Link href={`/post/${post.id}`}>
      <div className="rounded-xl border bg-muted/40 p-3 hover:bg-accent/50 transition-colors space-y-1">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarImage src={post.author.avatarUrl ?? ""} alt={post.author.name} />
            <AvatarFallback className="text-[9px]">{post.author.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold">{post.author.name}</span>
          {post.author.isVerified && <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />}
          <span className="text-xs text-muted-foreground">@{post.author.username}</span>
        </div>
        {post.content && (
          <p className="text-[13px] text-muted-foreground line-clamp-2">{post.content}</p>
        )}
        {post.mediaUrls.length > 0 && (
          <div className="relative h-20 rounded-lg overflow-hidden bg-muted">
            <Image src={post.mediaUrls[0]} alt="quoted media" fill className="object-cover" sizes="400px" />
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

export const PostCard = memo(function PostCard({ post, style }: PostCardProps) {
  const { data: session } = useSession()
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post._count.likes)
  const [reactionType, setReactionType] = useState<string | null>(post.reactionType ?? null)
  const [isShared, setIsShared] = useState(post.isShared)
  const [shareCount, setShareCount] = useState(post._count.shares)
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false)
  const [showMenu, setShowMenu] = useState(false)
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false)
  const [showCollectionPicker, setShowCollectionPicker] = useState(false)
  const [showQuoteDialog, setShowQuoteDialog] = useState(false)
  const [quoteText, setQuoteText] = useState("")

  const utils = trpc.useUtils()

  const toggleLike = trpc.post.toggleLike.useMutation({
    onMutate: ({ reactionType: rt }) => {
      if (isLiked && reactionType === rt) {
        // Toggle off
        setIsLiked(false)
        setReactionType(null)
        setLikeCount((prev) => prev - 1)
      } else if (isLiked) {
        // Change reaction
        setReactionType(rt ?? null)
      } else {
        // New like
        setIsLiked(true)
        setReactionType(rt ?? null)
        setLikeCount((prev) => prev + 1)
      }
    },
    onError: () => {
      setIsLiked(post.isLiked)
      setReactionType(post.reactionType ?? null)
      setLikeCount(post._count.likes)
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
    onSuccess: () => utils.post.getByUser.invalidate(),
  })

  const { data: myCollections } = trpc.collection.myCollections.useQuery(undefined, {
    enabled: showCollectionPicker && !!session,
  })
  const addToCollection = trpc.collection.addPost.useMutation()

  const quotePost = trpc.post.create.useMutation({
    onSuccess: () => {
      setShowQuoteDialog(false)
      setQuoteText("")
      utils.post.getFeed.invalidate()
    },
  })

  const isOwner = session?.user?.id === post.author.id

  const scheduledDate = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null

  return (
    <article className="px-4 py-3 space-y-2.5 animate-fade-in-up" style={style}>
      {/* Scheduled label (owner only) */}
      {isOwner && scheduledDate && post.isPublished === false && (
        <div className="flex items-center gap-1.5 text-xs text-amber-500 -mb-1">
          <Clock className="h-3 w-3" />
          <span>Scheduled for {scheduledDate}</span>
        </div>
      )}

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
          <Link href={`/profile/${post.parentPost.author.username}`} className="text-primary hover:underline">
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
              {post.author.isVerified && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />}
            </Link>
            <p className="text-xs text-muted-foreground">
              @{post.author.username} · {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowMenu((prev) => !prev)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 rounded-lg border bg-popover shadow-md min-w-[140px]">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-t-lg"
                  onClick={() => { setShowMenu(false); pinPost.mutate({ postId: post.id }) }}
                >
                  <Pin className="h-4 w-4" />
                  {post.isPinned ? "Unpin" : "Pin to profile"}
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent rounded-b-lg"
                  onClick={() => { setShowMenu(false); deletePost.mutate({ id: post.id }) }}
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

      {/* Quoted post */}
      {post.originalPost && <QuotedPostCard post={post.originalPost} />}

      {/* Poll */}
      {post.poll && <PollDisplay poll={post.poll} postId={post.id} />}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 -mx-2">
        {/* Reaction button */}
        <ReactionButton
          isLiked={isLiked}
          likeCount={likeCount}
          reactionType={reactionType}
          onReact={(type) => session && toggleLike.mutate({ postId: post.id, reactionType: type })}
          disabled={!session}
        />

        {/* Comments */}
        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          <span className="text-xs tabular-nums">{post._count.comments > 0 ? post._count.comments : ""}</span>
        </Link>

        {/* Share */}
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

        {/* Quote */}
        {session && (
          <button
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
            onClick={() => setShowQuoteDialog(true)}
            title="Quote post"
          >
            <Quote className="h-[18px] w-[18px]" />
          </button>
        )}

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
            className={cn("h-[18px] w-[18px]", isBookmarked && "fill-current", bookmarkAnimating && "animate-like-bounce")}
            onAnimationEnd={() => setBookmarkAnimating(false)}
          />
        </button>

        {/* Save to Collection */}
        {session && (
          <div className="relative">
            <button
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
              onClick={() => setShowCollectionPicker((prev) => !prev)}
              title="Save to collection"
            >
              <Library className="h-[18px] w-[18px]" />
            </button>
            {showCollectionPicker && (
              <div className="absolute bottom-full right-0 mb-1 z-50 rounded-lg border bg-popover shadow-md min-w-[180px]">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Save to collection
                </p>
                {!myCollections?.length ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No collections yet</p>
                ) : (
                  myCollections.map((col) => (
                    <button
                      key={col.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                      onClick={() => {
                        addToCollection.mutate({ collectionId: col.id, postId: post.id })
                        setShowCollectionPicker(false)
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{col.name}</span>
                    </button>
                  ))
                )}
                <div className="border-t" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-primary rounded-b-lg"
                  onClick={() => { setShowCollectionPicker(false); window.location.href = "/collections" }}
                >
                  <Library className="h-3.5 w-3.5 flex-shrink-0" />
                  Manage collections
                </button>
              </div>
            )}
          </div>
        )}

        {/* View count */}
        {post.viewCount != null && post.viewCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Eye className="h-3.5 w-3.5" />
            {post.viewCount}
          </span>
        )}
      </div>
      {/* Quote dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quote post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Textarea
              placeholder="Add your thoughts..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={2000}
              autoFocus
            />
            <QuotedPostCard post={{ id: post.id, content: post.content, mediaUrls: post.mediaUrls, author: post.author }} />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!quoteText.trim() || quotePost.isPending}
                onClick={() => quotePost.mutate({ content: quoteText.trim(), quotedPostId: post.id })}
              >
                {quotePost.isPending ? "Posting..." : "Quote"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  )
})
