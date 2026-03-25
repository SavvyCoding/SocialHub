import { describe, it, expect, vi } from "vitest"

// Mock bcryptjs to avoid slow hashing in unit tests
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$hashed$password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

import { userRouter } from "@/server/trpc/router/user"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(userRouter)

function makeCtx(sessionUserId?: string): Context {
  const db = {
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    follow: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    mutedKeyword: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as Context["db"]

  return {
    db,
    redis: {} as Context["redis"],
    session: sessionUserId
      ? {
          user: { id: sessionUserId, name: "Test User", email: "test@example.com" },
          expires: new Date(Date.now() + 3_600_000).toISOString(),
        }
      : null,
  }
}

// ─── register ─────────────────────────────────────────────────────────────────

describe("userRouter.register", () => {
  const validInput = {
    name: "Alice Smith",
    username: "alice",
    email: "alice@example.com",
    password: "Password1",
    confirmPassword: "Password1",
  }

  it("creates a new user and returns id/email/username", async () => {
    const ctx = makeCtx()
    ;(ctx.db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(ctx.db.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      username: "alice",
    })

    const result = await createCaller(ctx).register(validInput)
    expect(result.id).toBe("user-1")
    expect(result.email).toBe("alice@example.com")
    expect(result.username).toBe("alice")
  })

  it("throws CONFLICT when email is already registered", async () => {
    const ctx = makeCtx()
    ;(ctx.db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing",
      email: "alice@example.com",
      username: "other",
    })

    await expect(createCaller(ctx).register(validInput)).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("throws CONFLICT when username is already taken", async () => {
    const ctx = makeCtx()
    ;(ctx.db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing",
      email: "other@example.com",
      username: "alice",
    })

    await expect(createCaller(ctx).register(validInput)).rejects.toMatchObject({ code: "CONFLICT" })
  })
})

// ─── getByUsername ────────────────────────────────────────────────────────────

describe("userRouter.getByUsername", () => {
  it("returns user data when found", async () => {
    const ctx = makeCtx()
    const mockUser = {
      id: "user-1",
      name: "Alice",
      username: "alice",
      bio: "Hello!",
      avatarUrl: null,
      coverUrl: null,
      location: null,
      website: null,
      isVerified: false,
      createdAt: new Date(),
      _count: { sentFollows: 5, receivedFollows: 10, posts: 42 },
    }
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

    const result = await createCaller(ctx).getByUsername({ username: "alice" })
    expect(result.username).toBe("alice")
    expect(result._count.posts).toBe(42)
  })

  it("throws NOT_FOUND when user does not exist", async () => {
    const ctx = makeCtx()
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(createCaller(ctx).getByUsername({ username: "ghost" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})

// ─── me ──────────────────────────────────────────────────────────────────────

describe("userRouter.me", () => {
  it("throws UNAUTHORIZED when there is no session", async () => {
    await expect(createCaller(makeCtx()).me()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns the current user when authenticated", async () => {
    const ctx = makeCtx("user-1")
    const mockUser = {
      id: "user-1",
      name: "Test User",
      username: "testuser",
      email: "test@example.com",
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      location: null,
      website: null,
      isVerified: false,
      createdAt: new Date(),
    }
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

    const result = await createCaller(ctx).me()
    expect(result?.id).toBe("user-1")
    expect(result?.username).toBe("testuser")
  })
})

// ─── search ──────────────────────────────────────────────────────────────────

describe("userRouter.search", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx()).search({ q: "alice" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns matching users", async () => {
    const ctx = makeCtx("user-1")
    const users = [
      { id: "user-2", name: "Alice", username: "alice", avatarUrl: null, bio: null, isVerified: false, _count: { receivedFollows: 5 } },
    ]
    ;(ctx.db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(users)

    const result = await createCaller(ctx).search({ q: "alice" })
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe("alice")
  })

  it("returns an empty array when no users match", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const result = await createCaller(ctx).search({ q: "nobody" })
    expect(result).toEqual([])
  })
})

// ─── updateProfile ────────────────────────────────────────────────────────────

describe("userRouter.updateProfile", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx()).updateProfile({ name: "New Name" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("updates and returns the user profile", async () => {
    const ctx = makeCtx("user-1")
    const updated = {
      id: "user-1",
      name: "New Name",
      username: "testuser",
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      location: null,
      website: null,
    }
    ;(ctx.db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

    const result = await createCaller(ctx).updateProfile({ name: "New Name" })
    expect(result.name).toBe("New Name")
  })
})

// ─── getMutedKeywords ─────────────────────────────────────────────────────────

describe("userRouter.getMutedKeywords", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx()).getMutedKeywords()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns list of muted keywords for authenticated user", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.mutedKeyword.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "kw-1", keyword: "spam" },
      { id: "kw-2", keyword: "ads" },
    ])

    const result = await createCaller(ctx).getMutedKeywords()
    expect(result).toHaveLength(2)
    expect(result[0].keyword).toBe("spam")
  })

  it("returns empty array when no keywords are muted", async () => {
    const ctx = makeCtx("user-1")
    const result = await createCaller(ctx).getMutedKeywords()
    expect(result).toEqual([])
  })
})

// ─── addMutedKeyword ──────────────────────────────────────────────────────────

describe("userRouter.addMutedKeyword", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx()).addMutedKeyword({ keyword: "spam" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("creates a muted keyword lowercased", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.mutedKeyword.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "kw-1", keyword: "spam" })

    const result = await createCaller(ctx).addMutedKeyword({ keyword: "SPAM" })
    expect(ctx.db.mutedKeyword.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ keyword: "spam", userId: "user-1" }),
      })
    )
    expect(result.keyword).toBe("spam")
  })
})

// ─── removeMutedKeyword ───────────────────────────────────────────────────────

describe("userRouter.removeMutedKeyword", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx()).removeMutedKeyword({ id: "kw-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("deletes the keyword and returns success", async () => {
    const ctx = makeCtx("user-1")
    const result = await createCaller(ctx).removeMutedKeyword({ id: "kw-1" })
    expect(ctx.db.mutedKeyword.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "kw-1", userId: "user-1" }) })
    )
    expect(result.success).toBe(true)
  })
})

// ─── getMutualFollowers ───────────────────────────────────────────────────────

describe("userRouter.getMutualFollowers", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(
      createCaller(makeCtx()).getMutualFollowers({ targetUserId: "user-2" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns empty array when viewing own profile", async () => {
    const ctx = makeCtx("user-1")
    const result = await createCaller(ctx).getMutualFollowers({ targetUserId: "user-1" })
    expect(result).toEqual([])
    expect(ctx.db.follow.findMany).not.toHaveBeenCalled()
  })

  it("returns users both viewer and target follow", async () => {
    const ctx = makeCtx("user-1")
    // Viewer follows user-3, user-4
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ followingId: "user-3" }, { followingId: "user-4" }])
      // Target follows user-4, user-5
      .mockResolvedValueOnce([{ followingId: "user-4" }, { followingId: "user-5" }])

    ;(ctx.db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "user-4", name: "Mutual", username: "mutual", avatarUrl: null, isVerified: false },
    ])

    const result = await createCaller(ctx).getMutualFollowers({ targetUserId: "user-2" })
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe("mutual")
    expect(ctx.db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["user-4"] } }) })
    )
  })

  it("returns empty array when there are no mutual follows", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ followingId: "user-3" }])
      .mockResolvedValueOnce([{ followingId: "user-5" }])

    const result = await createCaller(ctx).getMutualFollowers({ targetUserId: "user-2" })
    expect(result).toEqual([])
    expect(ctx.db.user.findMany).not.toHaveBeenCalled()
  })
})
