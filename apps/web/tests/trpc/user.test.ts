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
      update: vi.fn().mockResolvedValue({}),
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
    userBadge: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: "badge-1", userId: "user-1", badgeType: "EARLY_ADOPTER", awardedAt: new Date() }),
    },
    notification: {
      create: vi.fn().mockResolvedValue({}),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  } as unknown as Context["db"]

  return {
    db,
    redis: {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    } as unknown as Context["redis"],
    session: sessionUserId
      ? {
          user: { id: sessionUserId, username: "testuser", name: "Test User", email: "test@example.com" },
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

// ─── getProfileScore ──────────────────────────────────────────────────────────

describe("userRouter.getProfileScore", () => {
  function makeFullUser(overrides = {}) {
    return {
      bio: "Hello I am Alice",
      avatarUrl: "https://example.com/avatar.jpg",
      coverUrl: "https://example.com/cover.jpg",
      location: "New York",
      website: "https://alice.dev",
      experiences: [{ id: "exp-1" }],
      educations: [{ id: "edu-1" }],
      skills: [{ id: "skill-1" }],
      bookEntries: [{ id: "book-1" }],
      movieEntries: [{ id: "movie-1" }],
      places: [{ id: "place-1" }],
      goals: [{ id: "goal-1" }],
      ...overrides,
    }
  }

  it("returns 100 score for a fully completed profile", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeFullUser())
    const result = await createCaller(ctx).getProfileScore()
    expect(result.score).toBe(100)
    expect(result.checks.every((c) => c.done)).toBe(true)
  })

  it("returns 0 score for an empty profile", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeFullUser({
      bio: null, avatarUrl: null, coverUrl: null, location: null, website: null,
      experiences: [], educations: [], skills: [], bookEntries: [], movieEntries: [], places: [], goals: [],
    }))
    const result = await createCaller(ctx).getProfileScore()
    expect(result.score).toBe(0)
    expect(result.checks.every((c) => !c.done)).toBe(true)
  })

  it("returns partial score with correct check labels", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeFullUser({
      bio: "I have a bio",
      avatarUrl: "https://example.com/avatar.jpg",
      coverUrl: null,
      location: null,
      website: null,
      experiences: [],
      educations: [],
      skills: [],
      bookEntries: [],
      movieEntries: [],
      places: [],
      goals: [],
    }))
    const result = await createCaller(ctx).getProfileScore()
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThan(100)
    const bioCheck = result.checks.find((c) => c.label === "Bio")
    expect(bioCheck?.done).toBe(true)
    const coverCheck = result.checks.find((c) => c.label === "Cover photo")
    expect(coverCheck?.done).toBe(false)
  })

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    await expect(createCaller(makeCtx()).getProfileScore()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

// ─── Phase 1: Profile View Counter ───────────────────────────────────────────

describe("userRouter.recordProfileView", () => {
  it("increments profileViews for another user's profile", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ profileViews: 1 })

    const result = await createCaller(ctx).recordProfileView({ profileUserId: "user-2" })
    expect(result.success).toBe(true)
    expect(ctx.db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { profileViews: { increment: 1 } } })
    )
  })

  it("does not count self-views", async () => {
    const ctx = makeCtx("user-1")
    const result = await createCaller(ctx).recordProfileView({ profileUserId: "user-1" })
    expect(result.success).toBe(true)
    expect(ctx.db.user.update).not.toHaveBeenCalled()
  })

  it("does not increment when already viewed in the last hour", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.redis.get as ReturnType<typeof vi.fn>).mockResolvedValue("1")
    const result = await createCaller(ctx).recordProfileView({ profileUserId: "user-2" })
    expect(result.success).toBe(true)
    expect(ctx.db.user.update).not.toHaveBeenCalled()
  })

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    await expect(createCaller(makeCtx()).recordProfileView({ profileUserId: "user-2" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

describe("userRouter.getProfileViews", () => {
  it("returns the authenticated user's profile view count", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ profileViews: 42 })
    const result = await createCaller(ctx).getProfileViews()
    expect(result.profileViews).toBe(42)
  })

  it("returns 0 when user not found", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const result = await createCaller(ctx).getProfileViews()
    expect(result.profileViews).toBe(0)
  })
})

// ─── 2026-03-26: User Pronouns ────────────────────────────────────────────────

describe("userRouter.updateProfile — pronouns", () => {
  it("updates pronouns field and returns it", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      name: "Alice",
      username: "alice",
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      location: null,
      website: null,
      pronouns: "she/her",
    })

    const result = await createCaller(ctx).updateProfile({ pronouns: "she/her" })
    expect((result as any).pronouns).toBe("she/her")
  })

  it("allows nulling out pronouns", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      name: "Alice",
      username: "alice",
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      location: null,
      website: null,
      pronouns: null,
    })

    const result = await createCaller(ctx).updateProfile({ pronouns: null })
    expect((result as any).pronouns).toBeNull()
  })

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    await expect(createCaller(makeCtx()).updateProfile({ pronouns: "they/them" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

// ─── 2026-03-26: User Badges ──────────────────────────────────────────────────

describe("userRouter.getBadges", () => {
  it("returns badges for a user", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.userBadge.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "b-1", userId: "user-1", badgeType: "EARLY_ADOPTER", awardedAt: new Date() },
    ])

    const result = await createCaller(ctx).getBadges({ userId: "user-1" })
    expect(result).toHaveLength(1)
    expect(result[0].badgeType).toBe("EARLY_ADOPTER")
  })

  it("returns empty array when user has no badges", async () => {
    const ctx = makeCtx()
    ;(ctx.db.userBadge.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const result = await createCaller(ctx).getBadges({ userId: "user-2" })
    expect(result).toEqual([])
  })
})

describe("userRouter.awardBadge", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(
      createCaller(makeCtx()).awardBadge({ userId: "user-1", badgeType: "EARLY_ADOPTER" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("throws FORBIDDEN when awarding to another user", async () => {
    const ctx = makeCtx("user-1")
    await expect(
      createCaller(ctx).awardBadge({ userId: "user-2", badgeType: "POWER_USER" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("upserts badge for self successfully", async () => {
    const ctx = makeCtx("user-1")
    const badge = { id: "b-1", userId: "user-1", badgeType: "EARLY_ADOPTER", awardedAt: new Date() }
    ;(ctx.db.userBadge.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(badge)

    const result = await createCaller(ctx).awardBadge({ userId: "user-1", badgeType: "EARLY_ADOPTER" })
    expect(result.badgeType).toBe("EARLY_ADOPTER")
  })
})

// ─── 2026-03-26: Follower Milestones ─────────────────────────────────────────

describe("userRouter.getFollowerMilestone", () => {
  it("returns follower count and milestone info", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      followerMilestones: 10,
      _count: { receivedFollows: 55 },
    })

    const result = await createCaller(ctx).getFollowerMilestone({ userId: "user-1" })
    expect(result.followerCount).toBe(55)
    expect(result.achievedMilestones).toContain(10)
    expect(result.achievedMilestones).toContain(50)
    expect(result.nextMilestone).toBe(100)
  })

  it("throws NOT_FOUND when user does not exist", async () => {
    const ctx = makeCtx()
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(
      createCaller(ctx).getFollowerMilestone({ userId: "ghost" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
