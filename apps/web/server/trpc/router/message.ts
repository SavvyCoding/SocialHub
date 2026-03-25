import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure } from "../trpc"
import { RATE_LIMITS } from "@/lib/rate-limit"
import { eventBus } from "@/server/events/event-bus"

export const messageRouter = router({
  // Get conversations for the current user (paginated)
  getConversations: authedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().default(20) }).default({}))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { cursor, limit } = input

      const conversations = await ctx.db.conversation.findMany({
        where: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
        include: {
          participant1: { select: { id: true, name: true, username: true, avatarUrl: true } },
          participant2: { select: { id: true, name: true, username: true, avatarUrl: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: "desc" },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })

      let nextCursor: string | undefined
      if (conversations.length > limit) nextCursor = conversations.pop()?.id

      return {
        conversations: conversations.map((conv) => ({
          id: conv.id,
          lastMessageAt: conv.lastMessageAt,
          lastMessage: conv.messages[0] ?? null,
          other: conv.participant1Id === userId ? conv.participant2 : conv.participant1,
        })),
        nextCursor,
      }
    }),

  // Get or create a 1-on-1 conversation with another user
  getOrCreate: authedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const myId = ctx.session.user.id
      if (myId === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" })
      }

      // Sort IDs so participant1Id < participant2Id for consistent uniqueness
      const [p1, p2] = [myId, input.userId].sort()

      const existing = await ctx.db.conversation.findUnique({
        where: { participant1Id_participant2Id: { participant1Id: p1, participant2Id: p2 } },
      })
      if (existing) return { id: existing.id }

      const conv = await ctx.db.conversation.create({
        data: { participant1Id: p1, participant2Id: p2 },
      })
      return { id: conv.id }
    }),

  // Paginated messages in a conversation (newest-first, reversed on client)
  getMessages: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const conv = await ctx.db.conversation.findUnique({
        where: { id: input.conversationId },
        select: { participant1Id: true, participant2Id: true },
      })
      if (!conv || (conv.participant1Id !== userId && conv.participant2Id !== userId)) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const messages = await ctx.db.directMessage.findMany({
        where: { conversationId: input.conversationId },
        include: {
          sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })

      let nextCursor: string | undefined
      if (messages.length > input.limit) nextCursor = messages.pop()?.id

      // Mark incoming messages as read
      await ctx.db.directMessage.updateMany({
        where: { conversationId: input.conversationId, senderId: { not: userId }, isRead: false },
        data: { isRead: true },
      })

      return { messages: messages.reverse(), nextCursor }
    }),

  // Send a message
  send: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(2000).trim(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.message(userId)

      const conv = await ctx.db.conversation.findUnique({
        where: { id: input.conversationId },
        select: { participant1Id: true, participant2Id: true },
      })
      if (!conv || (conv.participant1Id !== userId && conv.participant2Id !== userId)) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const [msg] = await ctx.db.$transaction([
        ctx.db.directMessage.create({
          data: { conversationId: input.conversationId, senderId: userId, content: input.content },
          include: {
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        }),
        ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { lastMessageAt: new Date() },
        }),
      ])

      const recipientId =
        conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id

      eventBus.emit("message.sent", { messageId: msg.id, conversationId: input.conversationId, senderId: userId, recipientId })

      return msg
    }),

  // Unread message count (for badge) — single query using relation filter
  getUnreadCount: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const count = await ctx.db.directMessage.count({
      where: {
        senderId: { not: userId },
        isRead: false,
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      },
    })
    return { count }
  }),
})
