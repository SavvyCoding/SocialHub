import { describe, it, expect, vi } from "vitest"

import { profileRouter } from "@/server/trpc/router/profile"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(profileRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    experience: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    education: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    userSkill: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    skill: {
      upsert: vi.fn(),
    },
    endorsement: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
  } as unknown as Context["db"]

  return {
    db,
    redis: {} as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

// ─── Experience ──────────────────────────────────────────────────────────────

describe("profileRouter.getExperiences", () => {
  it("returns experiences for a user (public)", async () => {
    const ctx = makeCtx(null) // works without auth
    const result = await createCaller(ctx).getExperiences({ userId: "user-1" })
    expect(result).toEqual([])
  })
})

describe("profileRouter.addExperience", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(
      createCaller(makeCtx(null)).addExperience({ title: "SWE", company: "Acme", startDate: "2024-01-01" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("creates an experience", async () => {
    const ctx = makeCtx()
    const created = { id: "exp-1", title: "SWE", company: "Acme" }
    ;(ctx.db.experience.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)
    const result = await createCaller(ctx).addExperience({ title: "SWE", company: "Acme", startDate: "2024-01-01" })
    expect(result.id).toBe("exp-1")
  })
})

describe("profileRouter.deleteExperience", () => {
  it("throws FORBIDDEN when not the owner", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.experience.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "exp-1", userId: "user-2" })
    await expect(createCaller(ctx).deleteExperience({ id: "exp-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("deletes own experience", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.experience.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "exp-1", userId: "user-1" })
    const result = await createCaller(ctx).deleteExperience({ id: "exp-1" })
    expect(result.success).toBe(true)
  })
})

// ─── Education ───────────────────────────────────────────────────────────────

describe("profileRouter.addEducation", () => {
  it("creates an education entry", async () => {
    const ctx = makeCtx()
    const created = { id: "edu-1", school: "MIT", startYear: 2020 }
    ;(ctx.db.education.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)
    const result = await createCaller(ctx).addEducation({ school: "MIT", startYear: 2020 })
    expect(result.id).toBe("edu-1")
  })
})

describe("profileRouter.deleteEducation", () => {
  it("throws FORBIDDEN when not the owner", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.education.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "edu-1", userId: "user-2" })
    await expect(createCaller(ctx).deleteEducation({ id: "edu-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("deletes own education", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.education.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "edu-1", userId: "user-1" })
    const result = await createCaller(ctx).deleteEducation({ id: "edu-1" })
    expect(result.success).toBe(true)
  })
})

// ─── Skills ──────────────────────────────────────────────────────────────────

describe("profileRouter.addSkill", () => {
  it("upserts skill and user-skill", async () => {
    const ctx = makeCtx()
    ;(ctx.db.skill.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "skill-1", name: "typescript" })
    ;(ctx.db.userSkill.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "us-1", skill: { name: "typescript" }, _count: { endorsements: 0 } })
    const result = await createCaller(ctx).addSkill({ name: "TypeScript" })
    expect(result.skill.name).toBe("typescript")
  })
})

describe("profileRouter.removeSkill", () => {
  it("throws FORBIDDEN when not the owner", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.userSkill.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "us-1", userId: "user-2" })
    await expect(createCaller(ctx).removeSkill({ userSkillId: "us-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})

describe("profileRouter.endorseSkill", () => {
  it("throws NOT_FOUND for nonexistent skill", async () => {
    await expect(createCaller(makeCtx()).endorseSkill({ userSkillId: "bad" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws BAD_REQUEST when endorsing own skill", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.userSkill.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "us-1", userId: "user-1" })
    await expect(createCaller(ctx).endorseSkill({ userSkillId: "us-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("endorses another user's skill", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.userSkill.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "us-1", userId: "user-2" })
    const result = await createCaller(ctx).endorseSkill({ userSkillId: "us-1" })
    expect(result.endorsed).toBe(true)
  })

  it("toggles off an existing endorsement", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.userSkill.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "us-1", userId: "user-2" })
    ;(ctx.db.endorsement.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "end-1" })
    const result = await createCaller(ctx).endorseSkill({ userSkillId: "us-1" })
    expect(result.endorsed).toBe(false)
  })
})

// ─── Completeness ────────────────────────────────────────────────────────────

describe("profileRouter.getCompleteness", () => {
  it("returns 0% when nothing is filled", async () => {
    const ctx = makeCtx()
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Test", bio: null, avatarUrl: null, coverUrl: null, location: null, website: null,
    })
    const result = await createCaller(ctx).getCompleteness()
    expect(result.percent).toBe(0)
    expect(result.checks).toHaveLength(8)
    expect(result.checks.every((c) => !c.done)).toBe(true)
  })

  it("returns 100% when everything is filled", async () => {
    const ctx = makeCtx()
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Test", bio: "Bio", avatarUrl: "https://img.com/a.jpg", coverUrl: "https://img.com/c.jpg", location: "NYC", website: "https://me.com",
    })
    ;(ctx.db.experience.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(ctx.db.education.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(ctx.db.userSkill.count as ReturnType<typeof vi.fn>).mockResolvedValue(3)
    const result = await createCaller(ctx).getCompleteness()
    expect(result.percent).toBe(100)
  })
})

// ─── updateProfile ───────────────────────────────────────────────────────────

describe("profileRouter.updateProfile", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).updateProfile({ name: "New" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("updates the profile", async () => {
    const ctx = makeCtx()
    ;(ctx.db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1", name: "New", bio: "Bio" })
    const result = await createCaller(ctx).updateProfile({ name: "New", bio: "Bio" })
    expect(result.name).toBe("New")
  })
})
