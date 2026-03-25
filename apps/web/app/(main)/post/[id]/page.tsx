"use client"

import { use } from "react"
import { Loader2, ArrowLeft, MessageCircle } from "lucide-react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { PostCard } from "@/components/feed/PostCard"
import { CommentComposer } from "@/components/feed/CommentComposer"
import { CommentList } from "@/components/feed/CommentList"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: post, isLoading, isError } = trpc.post.getById.useQuery({ id })
  const { data: parentChain } = trpc.post.getParentChain.useQuery(
    { postId: id },
    { enabled: !!post?.parentPost }
  )

  return (
    <div className="space-y-0">
      {/* Back */}
      <div className="pb-3">
        <Link
          href="/feed"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Post not found.
        </div>
      )}

      {post && (
        <>
          {/* Parent thread chain — oldest ancestor first */}
          {parentChain && parentChain.length > 0 && (
            <div className="space-y-0 mb-1">
              {parentChain.map((ancestor, i) => (
                <div key={ancestor.id} className="relative">
                  <PostCard post={ancestor} />
                  {/* Thread connector line */}
                  {i < parentChain.length - 1 && (
                    <div className="absolute left-[28px] bottom-0 w-0.5 h-4 bg-border translate-y-full z-10" />
                  )}
                </div>
              ))}
              {/* Connector to main post */}
              <div className="ml-7 w-0.5 h-4 bg-border" />
            </div>
          )}

          {/* Main post */}
          <PostCard post={post} />

          {/* Comment section */}
          <div className="mt-4 rounded-lg border bg-card shadow-sm p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 pb-1 border-b">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                {post._count.comments > 0
                  ? `${post._count.comments} Comment${post._count.comments === 1 ? "" : "s"}`
                  : "Comments"}
              </h2>
            </div>

            {/* Composer */}
            <CommentComposer postId={id} />

            {/* List */}
            <CommentList postId={id} />
          </div>
        </>
      )}
    </div>
  )
}
