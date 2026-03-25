import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure, authedProcedure } from "../trpc"
import { authorSelect, countSelect } from "@/server/services/social-graph.service"

export const collectionRouter = router({
  // List a user's collections (public or own)
  list: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const isOwner = ctx.session?.user?.id === input.userId
      return ctx.db.collection.findMany({
        where: {
          userId: input.userId,
          ...(isOwner ? {} : { isPublic: true }),
        },
        include: {
          _count: { select: { items: true } },
          items: {
            take: 4,
            orderBy: { addedAt: "desc" },
            include: {
              post: { select: { mediaUrls: true, mediaTypes: true, content: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    }),

  // Get a single collection with posts
  getById: publicProcedure
    .input(z.object({ id: z.string(), cursor: z.string().optional(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const collection = await ctx.db.collection.findUnique({
        where: { id: input.id },
        include: { user: { select: authorSelect } },
      })
      if (!collection) throw new TRPCError({ code: "NOT_FOUND" })
      const isOwner = ctx.session?.user?.id === collection.userId
      if (!collection.isPublic && !isOwner) throw new TRPCError({ code: "FORBIDDEN" })

      const userId = ctx.session?.user?.id
      const pollInclude = {
        options: { orderBy: { order: "asc" as const } },
        ...(userId ? { votes: { where: { userId } } } : {}),
      }

      const items = await ctx.db.collectionItem.findMany({
        where: { collectionId: input.id },
        include: {
          post: {
            include: {
              author: { select: authorSelect },
              _count: { select: countSelect },
              poll: { include: pollInclude },
            },
          },
        },
        orderBy: { addedAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) nextCursor = items.pop()?.id

      return { collection, items, nextCursor }
    }),

  // Create a collection
  create: authedProcedure
    .input(z.object({ name: z.string().min(1).max(100), description: z.string().max(300).optional(), isPublic: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.collection.create({
        data: { userId: ctx.session.user.id, ...input },
      })
    }),

  // Update a collection
  update: authedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(100).optional(), description: z.string().max(300).optional(), isPublic: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const col = await ctx.db.collection.findUnique({ where: { id } })
      if (!col || col.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      return ctx.db.collection.update({ where: { id }, data })
    }),

  // Delete a collection
  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const col = await ctx.db.collection.findUnique({ where: { id: input.id } })
      if (!col || col.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      return ctx.db.collection.delete({ where: { id: input.id } })
    }),

  // Add a post to a collection
  addPost: authedProcedure
    .input(z.object({ collectionId: z.string(), postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const col = await ctx.db.collection.findUnique({ where: { id: input.collectionId } })
      if (!col || col.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      return ctx.db.collectionItem.upsert({
        where: { collectionId_postId: { collectionId: input.collectionId, postId: input.postId } },
        create: { collectionId: input.collectionId, postId: input.postId },
        update: {},
      })
    }),

  // Remove a post from a collection
  removePost: authedProcedure
    .input(z.object({ collectionId: z.string(), postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const col = await ctx.db.collection.findUnique({ where: { id: input.collectionId } })
      if (!col || col.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      return ctx.db.collectionItem.delete({
        where: { collectionId_postId: { collectionId: input.collectionId, postId: input.postId } },
      })
    }),

  // Get user's collections (for "save to collection" dropdown on posts)
  myCollections: authedProcedure.query(async ({ ctx }) => {
    return ctx.db.collection.findMany({
      where: { userId: ctx.session.user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    })
  }),
})
