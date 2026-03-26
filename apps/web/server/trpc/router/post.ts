import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure, authedProcedure } from "../trpc"
import { createPostSchema, getFeedSchema } from "@/lib/validators/post"
import { extractHashtags, extractMentions } from "@/lib/utils"
import { RATE_LIMITS } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { audit } from "@/server/services/audit.service"
import { eventBus } from "@/server/events/event-bus"
import {
  getExcludedUserIds,
  getFollowingIds,
  batchGetInteractions,
  authorSelect,
  countSelect,
} from "@/server/services/social-graph.service"

const quotedPostInclude = {
  originalPost: {
    select: {
      id: true,
      content: true,
      mediaUrls: true,
      author: { select: authorSelect },
    },
  },
}
import { getRecommendedPosts } from "@/server/services/embedding.service"

export const postRouter = router({
  // ─── Feed queries ────────────────────────────────────────────────────────────

  getFeed: authedProcedure.input(getFeedSchema).query(async ({ ctx, input }) => {
    const { cursor, limit } = input
    const userId = ctx.session.user.id
    await RATE_LIMITS.readFeed(userId)

    const [followingIds, excludedIds, mutedKeywords] = await Promise.all([
      getFollowingIds(ctx.db, ctx.redis, userId),
      getExcludedUserIds(ctx.db, ctx.redis, userId),
      ctx.db.mutedKeyword.findMany({ where: { userId }, select: { keyword: true } }),
    ])

    const keywordFilter = mutedKeywords.length > 0
      ? { NOT: { OR: mutedKeywords.map(({ keyword }) => ({ content: { contains: keyword, mode: "insensitive" as const } })) } }
      : {}

    const posts = await ctx.db.post.findMany({
      where: {
        authorId: { in: [userId, ...followingIds], notIn: excludedIds },
        parentPostId: null,
        isPublished: true,
        isDraft: false,
        ...keywordFilter,
      },
      include: {
        author: { select: authorSelect },
        _count: { select: countSelect },
        poll: { include: { options: { orderBy: { order: "asc" } }, votes: { where: { userId } } } },
        ...quotedPostInclude,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    })

    let nextCursor: string | undefined
    if (posts.length > limit) nextCursor = posts.pop()?.id

    const interactions = await batchGetInteractions(ctx.db, userId, posts.map((p) => p.id))

    return {
      posts: posts.map((p) => ({
        ...p,
        ...(interactions.get(p.id) ?? { isLiked: false, isShared: false, isBookmarked: false, reactionType: null }),
        parentPost: null,
      })),
      nextCursor,
    }
  }),

  getExploreFeed: authedProcedure.input(getFeedSchema).query(async ({ ctx, input }) => {
    const { cursor, limit } = input
    const userId = ctx.session.user.id
    await RATE_LIMITS.readFeed(userId)

    const excludedIds = await getExcludedUserIds(ctx.db, ctx.redis, userId)

    const posts = await ctx.db.post.findMany({
      where: { visibility: "PUBLIC", parentPostId: null, authorId: { notIn: excludedIds }, isPublished: true },
      include: {
        author: { select: authorSelect },
        _count: { select: countSelect },
        poll: { include: { options: { orderBy: { order: "asc" } }, votes: { where: { userId } } } },
        ...quotedPostInclude,
      },
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    })
    let nextCursor: string | undefined
    if (posts.length > limit) nextCursor = posts.pop()?.id

    const interactions = await batchGetInteractions(ctx.db, userId, posts.map((p) => p.id))

    return {
      posts: posts.map((p) => ({
        ...p,
        ...(interactions.get(p.id) ?? { isLiked: false, isShared: false, isBookmarked: false, reactionType: null }),
        parentPost: null,
      })),
      nextCursor,
    }
  }),

  getByUser: authedProcedure
    .input(z.object({ username: z.string(), cursor: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.readProfile(userId)

      const author = await ctx.db.user.findUnique({ where: { username: input.username } })
      if (!author) return { posts: [], nextCursor: undefined }

      let visibilityFilter: object
      if (author.id === userId) {
        visibilityFilter = {}
      } else {
        const isFollowing = await ctx.db.follow.findUnique({
          where: { followerId_followingId: { followerId: userId, followingId: author.id } },
        })
        visibilityFilter = isFollowing
          ? { visibility: { in: ["PUBLIC", "FOLLOWERS"] } }
          : { visibility: "PUBLIC" }
      }

      const posts = await ctx.db.post.findMany({
        where: { authorId: author.id, parentPostId: null, isPublished: true, ...visibilityFilter },
        include: {
          author: { select: authorSelect },
          _count: { select: countSelect },
          poll: { include: { options: { orderBy: { order: "asc" } }, votes: { where: { userId } } } },
          ...quotedPostInclude,
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (posts.length > input.limit) nextCursor = posts.pop()?.id

      const interactions = await batchGetInteractions(ctx.db, userId, posts.map((p) => p.id))

      return {
        posts: posts.map((p) => ({
          ...p,
          ...(interactions.get(p.id) ?? { isLiked: false, isShared: false, isBookmarked: false, reactionType: null }),
          parentPost: null,
        })),
        nextCursor,
      }
    }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id
    const post = await ctx.db.post.findUnique({
      where: { id: input.id },
      include: {
        author: { select: authorSelect },
        _count: { select: countSelect },
        parent: { select: { id: true, author: { select: { id: true, name: true, username: true } } } },
      },
    })
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })

    // Enforce visibility
    if (post.visibility !== "PUBLIC" && post.authorId !== userId) {
      if (!userId) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })
      if (post.visibility === "PRIVATE") throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })
      if (post.visibility === "FOLLOWERS") {
        const isFollowing = await ctx.db.follow.findUnique({
          where: { followerId_followingId: { followerId: userId, followingId: post.authorId } },
        })
        if (!isFollowing) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })
      }
    }

    let isLiked = false
    let isShared = false
    if (userId) {
      const interactions = await batchGetInteractions(ctx.db, userId, [post.id])
      const flags = interactions.get(post.id)
      if (flags) {
        isLiked = flags.isLiked
        isShared = flags.isShared
      }
    }

    return {
      ...post,
      isLiked,
      isShared,
      parentPost: post.parent ?? null,
    }
  }),

  // Walk up the parentPostId chain and return ancestors oldest-first (max depth: 5)
  getParentChain: publicProcedure.input(z.object({ postId: z.string() })).query(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id
    const seed = await ctx.db.post.findUnique({
      where: { id: input.postId },
      select: { parentPostId: true },
    })
    if (!seed?.parentPostId) return []

    type AncestorRow = {
      id: string; content: string | null; mediaUrls: string[]; createdAt: Date; parentPostId: string | null
      author: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean }
      _count: { likes: number; comments: number; shares: number }
    } | null

    let currentId: string | null = seed.parentPostId
    const ancestorIds: string[] = []
    const ancestors: NonNullable<AncestorRow>[] = []

    for (let i = 0; i < 5 && currentId; i++) {
      const ancestor: AncestorRow = await ctx.db.post.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          content: true,
          mediaUrls: true,
          createdAt: true,
          parentPostId: true,
          author: { select: authorSelect },
          _count: { select: countSelect },
        },
      }) as AncestorRow
      if (!ancestor) break
      ancestors.unshift(ancestor)
      ancestorIds.unshift(ancestor.id)
      currentId = ancestor.parentPostId
    }

    const interactions = userId
      ? await batchGetInteractions(ctx.db, userId, ancestorIds)
      : new Map<string, { isLiked: boolean; isShared: boolean; isBookmarked: boolean }>()

    return ancestors.map((ancestor) => {
      const flags = interactions.get(ancestor.id)
      return {
        id: ancestor.id,
        content: ancestor.content,
        mediaUrls: ancestor.mediaUrls,
        createdAt: ancestor.createdAt,
        parentPostId: ancestor.parentPostId,
        author: ancestor.author,
        _count: ancestor._count,
        isLiked: flags?.isLiked ?? false,
        isShared: flags?.isShared ?? false,
        parentPost: null,
      }
    })
  }),

  // ─── Post mutations ──────────────────────────────────────────────────────────

  create: authedProcedure.input(createPostSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id
    await RATE_LIMITS.createPost(userId)
    const hashtags = input.content ? extractHashtags(input.content) : []
    const mentionedUsernames = input.content ? extractMentions(input.content) : []

    const mentionedUsers = mentionedUsernames.length > 0
      ? await ctx.db.user.findMany({
          where: { username: { in: mentionedUsernames } },
          select: { id: true, username: true },
        })
      : []

    const isScheduled = input.scheduledAt && input.scheduledAt.getTime() > Date.now()

    const post = await ctx.db.post.create({
      data: {
        authorId: userId,
        content: input.content,
        mediaUrls: input.mediaUrls ?? [],
        visibility: input.visibility,
        isPublished: !isScheduled,
        scheduledAt: input.scheduledAt ?? null,
        originalPostId: input.quotedPostId ?? null,
        hasSensitiveContent: input.hasSensitiveContent ?? false,
        hashtags: hashtags.length > 0
          ? {
              create: hashtags.map((name) => ({
                hashtag: { connectOrCreate: { where: { name }, create: { name } } },
              })),
            }
          : undefined,
        mentions: mentionedUsers.length > 0
          ? { create: mentionedUsers.map((u) => ({ userId: u.id })) }
          : undefined,
        poll: input.poll
          ? {
              create: {
                question: input.poll.question,
                options: {
                  create: input.poll.options.map((text, i) => ({ text, order: i })),
                },
              },
            }
          : undefined,
      },
      include: {
        author: { select: authorSelect },
        _count: { select: countSelect },
        poll: { include: { options: { orderBy: { order: "asc" } } } },
      },
    })

    if (!isScheduled) {
      eventBus.emit("post.created", {
        postId: post.id,
        authorId: userId,
        mentionedUserIds: mentionedUsers.map((u) => u.id),
      })
    } else {
      // Enqueue delayed publish job
      const { createQueue } = await import("@/lib/queue")
      const publishQueue = createQueue("publish-scheduled-posts")
      const delay = input.scheduledAt!.getTime() - Date.now()
      await publishQueue.add("publish", { postId: post.id }, { delay })
    }

    return { ...post, isLiked: false, isShared: false, isBookmarked: false, parentPost: null }
  }),

  // ─── Thread creation ──────────────────────────────────────────────────────────

  createThread: authedProcedure
    .input(z.object({
      posts: z.array(z.object({
        content: z.string().min(1).max(2000).optional(),
        mediaUrls: z.array(z.string().url()).max(4).optional(),
      })).min(2).max(10),
      visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.createPost(userId)

      let previousPostId: string | null = null
      const createdIds: string[] = []

      for (const part of input.posts) {
        if (!part.content?.trim() && !part.mediaUrls?.length) continue
        const hashtags = part.content ? extractHashtags(part.content) : []
        const post = await ctx.db.post.create({
          data: {
            authorId: userId,
            content: part.content ?? null,
            mediaUrls: part.mediaUrls ?? [],
            visibility: input.visibility,
            parentPostId: previousPostId,
            hashtags: hashtags.length > 0
              ? { create: hashtags.map((name) => ({ hashtag: { connectOrCreate: { where: { name }, create: { name } } } })) }
              : undefined,
          },
        })
        if (!previousPostId) {
          // emit created event only for the root post
          eventBus.emit("post.created", { postId: post.id, authorId: userId, mentionedUserIds: [] })
        }
        previousPostId = post.id
        createdIds.push(post.id)
      }

      return { count: createdIds.length, rootPostId: createdIds[0] ?? null }
    }),

  edit: authedProcedure
    .input(z.object({
      id: z.string(),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const post = await ctx.db.post.findUnique({ where: { id: input.id }, select: { authorId: true } })
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })
      if (post.authorId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own posts" })

      return ctx.db.post.update({
        where: { id: input.id },
        data: { content: input.content },
        select: { id: true, content: true, updatedAt: true },
      })
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({ where: { id: input.id } })
      if (!post) throw new TRPCError({ code: "NOT_FOUND" })
      if (post.authorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own posts" })
      }
      await ctx.db.post.delete({ where: { id: input.id } })
      eventBus.emit("post.deleted", { postId: input.id, authorId: ctx.session.user.id })
      audit({ db: ctx.db, userId: ctx.session.user.id, action: "delete", resource: "post", resourceId: input.id }).catch(() => {})
      return { success: true }
    }),

  toggleLike: authedProcedure
    .input(z.object({
      postId: z.string(),
      reactionType: z.enum(["LIKE", "LOVE", "CELEBRATE", "INSIGHTFUL", "CURIOUS"]).default("LIKE"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const post = await ctx.db.post.findUnique({ where: { id: input.postId }, select: { authorId: true } })
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })

      const existing = await ctx.db.like.findUnique({
        where: { userId_postId: { userId, postId: input.postId } },
        select: { reactionType: true },
      })

      if (existing) {
        if (existing.reactionType === input.reactionType) {
          await ctx.db.like.delete({ where: { userId_postId: { userId, postId: input.postId } } })
          return { liked: false, reactionType: null }
        }
        await ctx.db.like.update({
          where: { userId_postId: { userId, postId: input.postId } },
          data: { reactionType: input.reactionType },
        })
        return { liked: true, reactionType: input.reactionType }
      }

      await ctx.db.like.create({ data: { userId, postId: input.postId, reactionType: input.reactionType } })
      eventBus.emit("post.liked", { postId: input.postId, actorId: userId, authorId: post.authorId })
      return { liked: true, reactionType: input.reactionType }
    }),

  toggleShare: authedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const post = await ctx.db.post.findUnique({ where: { id: input.postId }, select: { authorId: true } })
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })

      const existing = await ctx.db.share.findUnique({
        where: { userId_postId: { userId, postId: input.postId } },
      })
      if (existing) {
        await ctx.db.share.delete({ where: { userId_postId: { userId, postId: input.postId } } })
        return { shared: false }
      }
      await ctx.db.share.create({ data: { userId, postId: input.postId } })
      eventBus.emit("post.shared", { postId: input.postId, actorId: userId, authorId: post.authorId })
      return { shared: true }
    }),

  // ─── Comment mutations ───────────────────────────────────────────────────────

  addComment: authedProcedure
    .input(z.object({
      postId: z.string(),
      content: z.string().min(1).max(500),
      parentId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.comment(userId)

      if (input.parentId) {
        const parent = await ctx.db.comment.findUnique({ where: { id: input.parentId }, select: { postId: true } })
        if (!parent || parent.postId !== input.postId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid parent comment" })
        }
      }

      const comment = await ctx.db.comment.create({
        data: {
          postId: input.postId,
          authorId: userId,
          content: input.content,
          parentId: input.parentId,
        },
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true } },
          _count: { select: { likes: true, replies: true } },
        },
      })
      const post = await ctx.db.post.findUnique({ where: { id: input.postId }, select: { authorId: true } })
      if (post) {
        eventBus.emit("comment.created", { commentId: comment.id, postId: input.postId, postAuthorId: post.authorId, actorId: userId })
      }
      return { ...comment, isLiked: false }
    }),

  deleteComment: authedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUnique({ where: { id: input.commentId } })
      if (!comment) throw new TRPCError({ code: "NOT_FOUND" })
      if (comment.authorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own comments" })
      }
      await ctx.db.comment.delete({ where: { id: input.commentId } })
      return { success: true }
    }),

  toggleCommentLike: authedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const comment = await ctx.db.comment.findUnique({ where: { id: input.commentId }, select: { id: true } })
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" })

      const existing = await ctx.db.like.findUnique({
        where: { userId_commentId: { userId, commentId: input.commentId } },
      })
      if (existing) {
        await ctx.db.like.delete({ where: { userId_commentId: { userId, commentId: input.commentId } } })
        return { liked: false }
      }
      await ctx.db.like.create({ data: { userId, commentId: input.commentId } })
      return { liked: true }
    }),

  // ─── Post search ─────────────────────────────────────────────────────────────

  search: authedProcedure
    .input(z.object({ q: z.string().min(1).max(200), cursor: z.string().optional(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const { q, limit, cursor } = input
      const userId = ctx.session.user.id
      await RATE_LIMITS.search(userId)

      const posts = await ctx.db.post.findMany({
        where: { visibility: "PUBLIC", content: { contains: q, mode: "insensitive" } },
        include: {
          author: { select: authorSelect },
          _count: { select: countSelect },
          parent: { select: { id: true, author: { select: { id: true, name: true, username: true } } } },
        },
        orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (posts.length > limit) nextCursor = posts.pop()?.id

      const interactions = await batchGetInteractions(ctx.db, userId, posts.map((p) => p.id))

      return {
        posts: posts.map((p) => ({
          ...p,
          ...(interactions.get(p.id) ?? { isLiked: false, isShared: false, isBookmarked: false, reactionType: null }),
          parentPost: p.parent ?? null,
        })),
        nextCursor,
      }
    }),

  searchByHashtag: authedProcedure
    .input(z.object({ tag: z.string().min(1), cursor: z.string().optional(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const { tag, limit, cursor } = input
      const userId = ctx.session.user.id
      await RATE_LIMITS.search(userId)

      const posts = await ctx.db.post.findMany({
        where: {
          visibility: "PUBLIC",
          hashtags: { some: { hashtag: { name: tag.toLowerCase() } } },
        },
        include: {
          author: { select: authorSelect },
          _count: { select: countSelect },
          parent: { select: { id: true, author: { select: { id: true, name: true, username: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (posts.length > limit) nextCursor = posts.pop()?.id

      const interactions = await batchGetInteractions(ctx.db, userId, posts.map((p) => p.id))

      return {
        posts: posts.map((p) => ({
          ...p,
          ...(interactions.get(p.id) ?? { isLiked: false, isShared: false, isBookmarked: false, reactionType: null }),
          parentPost: p.parent ?? null,
        })),
        nextCursor,
      }
    }),

  // ─── Comment queries ─────────────────────────────────────────────────────────

  getComments: authedProcedure
    .input(z.object({
      postId: z.string(),
      parentId: z.string().nullish(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      sort: z.enum(["newest", "oldest", "top"]).default("oldest"),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const orderBy =
        input.sort === "newest" ? { createdAt: "desc" as const }
        : input.sort === "top"  ? { likes: { _count: "desc" as const } }
        : { createdAt: "asc" as const }

      const comments = await ctx.db.comment.findMany({
        where: {
          postId: input.postId,
          parentId: input.parentId ?? null,
        },
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true } },
          _count: { select: { likes: true, replies: true } },
          likes: { where: { userId }, select: { id: true }, take: 1 },
        },
        orderBy,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (comments.length > input.limit) nextCursor = comments.pop()?.id
      return {
        comments: comments.map((c) => ({ ...c, isLiked: c.likes.length > 0 })),
        nextCursor,
      }
    }),

  // ─── Bookmarks ───────────────────────────────────────────────────────────────

  toggleBookmark: authedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const post = await ctx.db.post.findUnique({ where: { id: input.postId }, select: { id: true } })
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })

      const existing = await ctx.db.bookmark.findUnique({
        where: { userId_postId: { userId, postId: input.postId } },
      })
      if (existing) {
        await ctx.db.bookmark.delete({ where: { userId_postId: { userId, postId: input.postId } } })
        return { bookmarked: false }
      }
      await ctx.db.bookmark.create({ data: { userId, postId: input.postId } })
      return { bookmarked: true }
    }),

  getBookmarks: authedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const bookmarks = await ctx.db.bookmark.findMany({
        where: { userId },
        include: {
          post: {
            include: {
              author: { select: authorSelect },
              _count: { select: countSelect },
              parent: { select: { id: true, author: { select: { id: true, name: true, username: true } } } },
              poll: { include: { options: { orderBy: { order: "asc" } }, votes: { where: { userId } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (bookmarks.length > input.limit) nextCursor = bookmarks.pop()?.id

      const postIds = bookmarks.map((b) => b.post.id)
      const interactions = await batchGetInteractions(ctx.db, userId, postIds)

      return {
        posts: bookmarks.map((b) => ({
          ...b.post,
          isLiked: interactions.get(b.post.id)?.isLiked ?? false,
          isShared: interactions.get(b.post.id)?.isShared ?? false,
          isBookmarked: true,
          parentPost: b.post.parent ?? null,
        })),
        nextCursor,
      }
    }),

  recordView: authedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const key = `post:views:${input.postId}:${userId}`
      const alreadyViewed = await ctx.redis.get(key)
      if (!alreadyViewed) {
        await ctx.db.post.update({ where: { id: input.postId }, data: { viewCount: { increment: 1 } } })
        await ctx.redis.setex(key, 3600, "1")
      }
      return { success: true }
    }),

  togglePin: authedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const post = await ctx.db.post.findUnique({ where: { id: input.postId }, select: { authorId: true, isPinned: true } })
      if (!post) throw new TRPCError({ code: "NOT_FOUND" })
      if (post.authorId !== userId) throw new TRPCError({ code: "FORBIDDEN" })

      if (post.isPinned) {
        await ctx.db.post.update({ where: { id: input.postId }, data: { isPinned: false, pinnedAt: null } })
        return { pinned: false }
      }

      // Unpin any existing pinned post
      await ctx.db.post.updateMany({ where: { authorId: userId, isPinned: true }, data: { isPinned: false, pinnedAt: null } })
      await ctx.db.post.update({ where: { id: input.postId }, data: { isPinned: true, pinnedAt: new Date() } })
      return { pinned: true }
    }),

  votePoll: authedProcedure
    .input(z.object({ pollId: z.string(), optionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const existing = await ctx.db.pollVote.findUnique({
        where: { userId_pollId: { userId, pollId: input.pollId } },
      })
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Already voted" })

      await ctx.db.$transaction([
        ctx.db.pollVote.create({ data: { pollId: input.pollId, optionId: input.optionId, userId } }),
        ctx.db.pollOption.update({ where: { id: input.optionId }, data: { voteCount: { increment: 1 } } }),
      ])
      return { success: true }
    }),

  getScheduled: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    return ctx.db.post.findMany({
      where: { authorId: userId, isPublished: false, scheduledAt: { not: null } },
      include: { author: { select: authorSelect }, _count: { select: countSelect } },
      orderBy: { scheduledAt: "asc" },
    })
  }),

  // ─── AI For You Feed ──────────────────────────────────────────────────────────

  getForYouFeed: authedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.readFeed(userId)

      const excludedIds = await getExcludedUserIds(ctx.db, ctx.redis, userId)

      // Try embedding-based recommendations
      const recommended = await getRecommendedPosts(ctx.db, userId, {
        limit: input.limit,
        excludePostIds: [],
      }).catch(() => [])

      const pollInclude = { options: { orderBy: { order: "asc" as const } }, votes: { where: { userId } } }
      const feedInclude = { author: { select: authorSelect }, _count: { select: countSelect }, poll: { include: pollInclude }, ...quotedPostInclude }

      let posts
      if (recommended.length > 0) {
        const postIds = recommended.map((r) => r.entityId)
        const rawPosts = await ctx.db.post.findMany({
          where: { id: { in: postIds }, isPublished: true, authorId: { notIn: [userId, ...excludedIds] } },
          include: feedInclude,
        })
        // Preserve similarity order
        const orderMap = new Map(postIds.map((id, i) => [id, i]))
        posts = rawPosts.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
      } else {
        // Fallback: trending public posts excluding self
        posts = await ctx.db.post.findMany({
          where: { visibility: "PUBLIC", parentPostId: null, isPublished: true, authorId: { notIn: [userId, ...excludedIds] } },
          include: feedInclude,
          orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
          take: input.limit,
        })
      }

      const interactions = await batchGetInteractions(ctx.db, userId, posts.map((p) => p.id))

      return {
        posts: posts.map((p) => ({
          ...p,
          ...(interactions.get(p.id) ?? { isLiked: false, isShared: false, isBookmarked: false, reactionType: null }),
          parentPost: null,
        })),
      }
    }),

  // ─── Live Activity Feed ───────────────────────────────────────────────────────

  getRecentActivity: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

    const followingIds = await getFollowingIds(ctx.db, ctx.redis, userId)
    if (followingIds.length === 0) return []

    // Recent posts by followed users
    const posts = await ctx.db.post.findMany({
      where: {
        authorId: { in: followingIds },
        createdAt: { gte: twoHoursAgo },
        isPublished: true,
        parentPostId: null,
      },
      include: { author: { select: authorSelect } },
      orderBy: { createdAt: "desc" },
      take: 15,
    })

    // Recent likes by followed users on any post
    const likes = await ctx.db.like.findMany({
      where: {
        userId: { in: followingIds },
        postId: { not: null },
        createdAt: { gte: twoHoursAgo },
      },
      include: {
        user: { select: authorSelect },
        post: { select: { id: true, content: true, author: { select: { username: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    })

    const activities = [
      ...posts.map((p) => ({
        id: `post-${p.id}`,
        type: "post" as const,
        actorName: p.author.name,
        actorUsername: p.author.username,
        actorAvatar: p.author.avatarUrl,
        actorVerified: p.author.isVerified,
        text: p.content?.slice(0, 80) ?? "",
        postId: p.id,
        createdAt: p.createdAt,
      })),
      ...likes
        .filter((l) => l.post)
        .map((l) => ({
          id: `like-${l.id}`,
          type: "like" as const,
          actorName: l.user.name,
          actorUsername: l.user.username,
          actorAvatar: l.user.avatarUrl,
          actorVerified: l.user.isVerified,
          text: l.post?.content?.slice(0, 60) ?? "",
          postId: l.postId ?? "",
          createdAt: l.createdAt,
        })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)

    return activities
  }),

  // ─── Phase 1: Post Drafts ────────────────────────────────────────────────────

  saveDraft: authedProcedure
    .input(z.object({
      content: z.string().max(2000).optional(),
      mediaUrls: z.array(z.string().url()).max(4).optional(),
      visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
      existingDraftId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      if (input.existingDraftId) {
        const draft = await ctx.db.post.findUnique({ where: { id: input.existingDraftId }, select: { authorId: true, isDraft: true } })
        if (!draft || draft.authorId !== userId || !draft.isDraft) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" })
        }
        return ctx.db.post.update({
          where: { id: input.existingDraftId },
          data: { content: input.content ?? null, mediaUrls: input.mediaUrls ?? [], visibility: input.visibility },
          select: { id: true, content: true, isDraft: true, createdAt: true, updatedAt: true },
        })
      }
      return ctx.db.post.create({
        data: {
          authorId: userId,
          content: input.content ?? null,
          mediaUrls: input.mediaUrls ?? [],
          visibility: input.visibility,
          isDraft: true,
          isPublished: false,
        },
        select: { id: true, content: true, isDraft: true, createdAt: true, updatedAt: true },
      })
    }),

  getDrafts: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    return ctx.db.post.findMany({
      where: { authorId: userId, isDraft: true },
      select: { id: true, content: true, mediaUrls: true, visibility: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
  }),

  publishDraft: authedProcedure
    .input(z.object({ draftId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const draft = await ctx.db.post.findUnique({ where: { id: input.draftId }, select: { authorId: true, isDraft: true } })
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" })
      if (draft.authorId !== userId) throw new TRPCError({ code: "FORBIDDEN" })
      if (!draft.isDraft) throw new TRPCError({ code: "BAD_REQUEST", message: "Post is not a draft" })

      const post = await ctx.db.post.update({
        where: { id: input.draftId },
        data: { isDraft: false, isPublished: true },
        include: { author: { select: authorSelect }, _count: { select: countSelect } },
      })
      eventBus.emit("post.created", { postId: post.id, authorId: userId, mentionedUserIds: [] })
      return { ...post, isLiked: false, isShared: false, isBookmarked: false, parentPost: null }
    }),

  deleteDraft: authedProcedure
    .input(z.object({ draftId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const draft = await ctx.db.post.findUnique({ where: { id: input.draftId }, select: { authorId: true, isDraft: true } })
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" })
      if (draft.authorId !== userId) throw new TRPCError({ code: "FORBIDDEN" })
      if (!draft.isDraft) throw new TRPCError({ code: "BAD_REQUEST", message: "Post is not a draft" })
      await ctx.db.post.delete({ where: { id: input.draftId } })
      return { success: true }
    }),

  // ─── Phase 1: Comment Pinning ─────────────────────────────────────────────────

  pinComment: authedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        select: { postId: true, isPinned: true },
      })
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" })
      const post = await ctx.db.post.findUnique({ where: { id: comment.postId }, select: { authorId: true } })
      if (!post || post.authorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the post author can pin comments" })
      }
      // Unpin any existing pinned comment on this post
      await ctx.db.comment.updateMany({ where: { postId: comment.postId, isPinned: true }, data: { isPinned: false } })
      if (comment.isPinned) return { pinned: false }
      await ctx.db.comment.update({ where: { id: input.commentId }, data: { isPinned: true } })
      return { pinned: true }
    }),

  unpinComment: authedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        select: { postId: true, isPinned: true },
      })
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" })
      const post = await ctx.db.post.findUnique({ where: { id: comment.postId }, select: { authorId: true } })
      if (!post || post.authorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the post author can unpin comments" })
      }
      await ctx.db.comment.update({ where: { id: input.commentId }, data: { isPinned: false } })
      return { pinned: false }
    }),

  // ─── Phase 2: Bookmark Folders ────────────────────────────────────────────────

  updateBookmarkFolder: authedProcedure
    .input(z.object({
      postId: z.string(),
      folder: z.string().max(50).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const bookmark = await ctx.db.bookmark.findUnique({
        where: { userId_postId: { userId, postId: input.postId } },
      })
      if (!bookmark) throw new TRPCError({ code: "NOT_FOUND", message: "Bookmark not found" })
      await ctx.db.bookmark.update({
        where: { userId_postId: { userId, postId: input.postId } },
        data: { folder: input.folder },
      })
      return { success: true }
    }),

  getBookmarkFolders: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const bookmarks = await ctx.db.bookmark.findMany({
      where: { userId, folder: { not: null } },
      select: { folder: true },
      distinct: ["folder"],
      orderBy: { folder: "asc" },
    })
    return bookmarks.map((b) => b.folder as string)
  }),

  getBookmarksByFolder: authedProcedure
    .input(z.object({
      folder: z.string().nullable(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const bookmarks = await ctx.db.bookmark.findMany({
        where: { userId, folder: input.folder },
        include: {
          post: {
            include: {
              author: { select: authorSelect },
              _count: { select: countSelect },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (bookmarks.length > input.limit) nextCursor = bookmarks.pop()?.id

      const postIds = bookmarks.map((b) => b.post.id)
      const interactions = await batchGetInteractions(ctx.db, userId, postIds)

      return {
        posts: bookmarks.map((b) => ({
          ...b.post,
          folder: b.folder,
          isLiked: interactions.get(b.post.id)?.isLiked ?? false,
          isShared: interactions.get(b.post.id)?.isShared ?? false,
          isBookmarked: true,
          parentPost: null,
        })),
        nextCursor,
      }
    }),
})
