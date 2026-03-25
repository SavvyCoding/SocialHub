import { describe, it, expect, vi } from "vitest"

vi.mock("@/server/services/notification.service", () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: {
    message: vi.fn().mockResolvedValue(undefined),
  },
  rateLimit: vi.fn().mockResolvedValue(1),
}))

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), removeAllListeners: vi.fn() },
}))

vi.mock("@/server/services/audit.service", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/queue", () => ({
  createQueue: vi.fn().mockReturnValue({ add: vi.fn().mockResolvedValue(undefined) }),
  Worker: vi.fn(),
}))

import { messageRouter } from "@/server/trpc/router/message"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(messageRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    conversation: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    directMessage: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn(),
  } as unknown as Context["db"]

  return {
    db,
    redis: {} as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

// ─── getConversations ────────────────────────────────────────────────────────

describe("messageRouter.getConversations", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).getConversations()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns empty list", async () => {
    const result = await createCaller(makeCtx()).getConversations({})
    expect(result.conversations).toEqual([])
  })

  it("maps conversations correctly", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "conv-1",
      participant1Id: "user-1",
      participant2Id: "user-2",
      participant1: { id: "user-1", name: "Me", username: "me", avatarUrl: null },
      participant2: { id: "user-2", name: "Alice", username: "alice", avatarUrl: null },
      messages: [{ id: "msg-1", content: "Hi" }],
      lastMessageAt: new Date(),
    }])
    const result = await createCaller(ctx).getConversations({})
    expect(result.conversations).toHaveLength(1)
    expect(result.conversations[0].other.username).toBe("alice")
    expect(result.conversations[0].lastMessage?.content).toBe("Hi")
  })
})

// ─── getOrCreate ─────────────────────────────────────────────────────────────

describe("messageRouter.getOrCreate", () => {
  it("throws BAD_REQUEST when messaging yourself", async () => {
    await expect(createCaller(makeCtx("user-1")).getOrCreate({ userId: "user-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("returns existing conversation", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "conv-1" })
    const result = await createCaller(ctx).getOrCreate({ userId: "user-2" })
    expect(result.id).toBe("conv-1")
    expect(ctx.db.conversation.create).not.toHaveBeenCalled()
  })

  it("creates a new conversation", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "conv-new" })
    const result = await createCaller(ctx).getOrCreate({ userId: "user-2" })
    expect(result.id).toBe("conv-new")
  })
})

// ─── getMessages ─────────────────────────────────────────────────────────────

describe("messageRouter.getMessages", () => {
  it("throws FORBIDDEN when not a participant", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      participant1Id: "user-2", participant2Id: "user-3",
    })
    await expect(createCaller(ctx).getMessages({ conversationId: "conv-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("throws FORBIDDEN when conversation not found", async () => {
    await expect(createCaller(makeCtx()).getMessages({ conversationId: "bad" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("returns messages and marks as read", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      participant1Id: "user-1", participant2Id: "user-2",
    })
    ;(ctx.db.directMessage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "msg-1", content: "Hello", sender: { id: "user-2" } },
    ])
    const result = await createCaller(ctx).getMessages({ conversationId: "conv-1" })
    expect(result.messages).toHaveLength(1)
    expect(ctx.db.directMessage.updateMany).toHaveBeenCalled()
  })
})

// ─── send ────────────────────────────────────────────────────────────────────

describe("messageRouter.send", () => {
  it("throws FORBIDDEN when not a participant", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      participant1Id: "user-2", participant2Id: "user-3",
    })
    await expect(createCaller(ctx).send({ conversationId: "conv-1", content: "Hi" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("sends a message via transaction", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      participant1Id: "user-1", participant2Id: "user-2",
    })
    const msg = { id: "msg-1", content: "Hi", sender: { id: "user-1", name: "Me", username: "me", avatarUrl: null } }
    ;(ctx.db.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([msg, {}])
    const result = await createCaller(ctx).send({ conversationId: "conv-1", content: "Hi" })
    expect(result.content).toBe("Hi")
  })
})

// ─── getUnreadCount ──────────────────────────────────────────────────────────

describe("messageRouter.getUnreadCount", () => {
  it("returns unread count", async () => {
    const ctx = makeCtx()
    ;(ctx.db.directMessage.count as ReturnType<typeof vi.fn>).mockResolvedValue(3)
    const result = await createCaller(ctx).getUnreadCount()
    expect(result.count).toBe(3)
  })
})
