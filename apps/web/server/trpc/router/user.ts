import { z } from "zod"
import { TRPCError } from "@trpc/server"
import bcrypt from "bcryptjs"
import { router, publicProcedure, authedProcedure } from "../trpc"
import { registerSchema } from "@/lib/validators/auth"

export const userRouter = router({
  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    const { name, username, email, password } = input

    const existing = await ctx.db.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: existing.email === email ? "Email already in use" : "Username already taken",
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await ctx.db.user.create({
      data: { name, username, email, passwordHash },
    })

    return { id: user.id, email: user.email, username: user.username }
  }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          avatarUrl: true,
          coverUrl: true,
          location: true,
          website: true,
          isVerified: true,
          pronouns: true,
          createdAt: true,
          _count: {
            select: {
              sentFollows: true,
              receivedFollows: true,
              posts: true,
            },
          },
        },
      })
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
      return user
    }),

  updateProfile: authedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50).optional(),
        bio: z.string().max(200).optional(),
        location: z.string().max(100).optional(),
        website: z.string().url().optional().or(z.literal("")),
        avatarUrl: z.string().url().startsWith("https://").optional(),
        coverUrl: z.string().url().startsWith("https://").optional(),
        pronouns: z.string().max(30).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          avatarUrl: true,
          coverUrl: true,
          location: true,
          website: true,
          pronouns: true,
        },
      })
    }),

  me: authedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        location: true,
        website: true,
        isVerified: true,
        pronouns: true,
        createdAt: true,
      },
    })
  }),

  search: authedProcedure
    .input(z.object({ q: z.string().min(1).max(100), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const { q, limit } = input
      return ctx.db.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
          NOT: { id: ctx.session.user.id },
        },
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          isVerified: true,
          _count: { select: { receivedFollows: true } },
        },
        take: limit,
        orderBy: { receivedFollows: { _count: "desc" } },
      })
    }),

  getSuggestions: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const following = await ctx.db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const followingIds = [userId, ...following.map((f) => f.followingId)]

    return ctx.db.user.findMany({
      where: { id: { notIn: followingIds } },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        _count: { select: { receivedFollows: true } },
      },
      take: 5,
      orderBy: { receivedFollows: { _count: "desc" } },
    })
  }),

  // For @mention autocomplete in the composer
  getMentionSuggestions: authedProcedure
    .input(z.object({ q: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          OR: [
            { username: { startsWith: input.q, mode: "insensitive" } },
            { name: { contains: input.q, mode: "insensitive" } },
          ],
          NOT: { id: ctx.session.user.id },
        },
        select: { id: true, name: true, username: true, avatarUrl: true },
        take: 6,
        orderBy: { receivedFollows: { _count: "desc" } },
      })
    }),

  getMutedKeywords: authedProcedure.query(async ({ ctx }) => {
    return ctx.db.mutedKeyword.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, keyword: true },
    })
  }),

  addMutedKeyword: authedProcedure
    .input(z.object({ keyword: z.string().min(1).max(100).trim() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mutedKeyword.create({
        data: { userId: ctx.session.user.id, keyword: input.keyword.toLowerCase() },
        select: { id: true, keyword: true },
      })
    }),

  removeMutedKeyword: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.mutedKeyword.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      return { success: true }
    }),

  getMutualFollowers: authedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      if (userId === input.targetUserId) return []

      // Users that both the viewer and the target follow
      const viewerFollowing = await ctx.db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
      const viewerFollowingIds = viewerFollowing.map((f) => f.followingId)

      const targetFollowing = await ctx.db.follow.findMany({
        where: { followerId: input.targetUserId },
        select: { followingId: true },
      })
      const targetFollowingIds = new Set(targetFollowing.map((f) => f.followingId))

      const mutualIds = viewerFollowingIds.filter((id) => targetFollowingIds.has(id))
      if (mutualIds.length === 0) return []

      return ctx.db.user.findMany({
        where: { id: { in: mutualIds } },
        select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true },
        take: 5,
      })
    }),

  getProfileScore: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        location: true,
        website: true,
        experiences: { select: { id: true }, take: 1 },
        educations:  { select: { id: true }, take: 1 },
        skills:      { select: { id: true }, take: 1 },
        bookEntries: { select: { id: true }, take: 1 },
        movieEntries:{ select: { id: true }, take: 1 },
        places:      { select: { id: true }, take: 1 },
        goals:       { select: { id: true }, take: 1 },
      },
    })
    if (!user) throw new TRPCError({ code: "NOT_FOUND" })

    const checks = [
      { label: "Bio",          done: !!user.bio },
      { label: "Avatar",       done: !!user.avatarUrl },
      { label: "Cover photo",  done: !!user.coverUrl },
      { label: "Location",     done: !!user.location },
      { label: "Website",      done: !!user.website },
      { label: "Experience",   done: user.experiences.length > 0 },
      { label: "Education",    done: user.educations.length > 0 },
      { label: "Skills",       done: user.skills.length > 0 },
      { label: "Books",        done: user.bookEntries.length > 0 },
      { label: "Movies",       done: user.movieEntries.length > 0 },
      { label: "Places",       done: user.places.length > 0 },
      { label: "Goals",        done: user.goals.length > 0 },
    ]

    const score = Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
    return { score, checks }
  }),

  getActivityHeatmap: publicProcedure
    .input(z.object({ userId: z.string(), days: z.number().default(365) }))
    .query(async ({ ctx, input }) => {
      const since = new Date()
      since.setDate(since.getDate() - input.days)

      const result = await ctx.db.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt")::text as date, COUNT(*)::bigint as count
        FROM posts
        WHERE "authorId" = ${input.userId}
          AND "createdAt" >= ${since}
          AND "isPublished" = true
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `

      return result.map((r) => ({ date: r.date, count: Number(r.count) }))
    }),

  // ─── Phase 1: Profile View Counter ───────────────────────────────────────────

  recordProfileView: authedProcedure
    .input(z.object({ profileUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const viewerId = ctx.session.user.id
      // Don't count self-views
      if (viewerId === input.profileUserId) return { success: true }
      const key = `profile:views:${input.profileUserId}:${viewerId}`
      const alreadyCounted = await ctx.redis.get(key)
      if (!alreadyCounted) {
        await ctx.db.user.update({
          where: { id: input.profileUserId },
          data: { profileViews: { increment: 1 } },
        })
        await ctx.redis.setex(key, 3600, "1")
      }
      return { success: true }
    }),

  getProfileViews: authedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { profileViews: true },
    })
    return { profileViews: user?.profileViews ?? 0 }
  }),

  // ─── 2026-03-26: User Badges ──────────────────────────────────────────────────

  getBadges: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.userBadge.findMany({
        where: { userId: input.userId },
        orderBy: { awardedAt: "asc" },
      })
    }),

  awardBadge: authedProcedure
    .input(z.object({
      userId: z.string(),
      badgeType: z.enum(["EARLY_ADOPTER", "POWER_USER", "TOP_CONTRIBUTOR"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only self-award supported for now (could be admin-only in production)
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot award badges to other users" })
      }
      return ctx.db.userBadge.upsert({
        where: { userId_badgeType: { userId: input.userId, badgeType: input.badgeType } },
        create: { userId: input.userId, badgeType: input.badgeType },
        update: {},
      })
    }),

  // ─── 2026-03-26: Follower Milestones ─────────────────────────────────────────

  getFollowerMilestone: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { followerMilestones: true, _count: { select: { receivedFollows: true } } },
      })
      if (!user) throw new TRPCError({ code: "NOT_FOUND" })
      const milestones = [10, 50, 100, 500, 1000]
      const currentCount = user._count.receivedFollows
      const achieved = milestones.filter((m) => currentCount >= m)
      const next = milestones.find((m) => currentCount < m) ?? null
      return { followerCount: currentCount, achievedMilestones: achieved, nextMilestone: next }
    }),

  checkAndNotifyFollowerMilestone: authedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.targetUserId },
        select: { followerMilestones: true, _count: { select: { receivedFollows: true } } },
      })
      if (!user) return { notified: false }
      const milestones = [10, 50, 100, 500, 1000]
      const currentCount = user._count.receivedFollows
      const newMilestone = milestones.find(
        (m) => currentCount >= m && user.followerMilestones < m
      )
      if (newMilestone) {
        await ctx.db.user.update({
          where: { id: input.targetUserId },
          data: { followerMilestones: newMilestone },
        })
        await ctx.db.notification.create({
          data: {
            recipientId: input.targetUserId,
            type: "FOLLOW",
            data: { milestone: newMilestone, message: `You reached ${newMilestone} followers!` },
          },
        })
        return { notified: true, milestone: newMilestone }
      }
      return { notified: false }
    }),
})
