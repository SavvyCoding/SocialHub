import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure, authedProcedure } from "../trpc"
import { RATE_LIMITS } from "@/lib/rate-limit"

const GOAL_CATEGORIES = [
  "Health & Fitness",
  "Career & Education",
  "Finance",
  "Personal Growth",
  "Travel",
  "Relationships",
  "Creativity",
  "Other",
] as const

export const goalRouter = router({
  // Get goals for a user (public, paginated)
  getGoals: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        category: z.string().optional(),
        completed: z.boolean().optional(),
        cursor: z.string().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId, category, completed, cursor, limit } = input
      const entries = await ctx.db.goal.findMany({
        where: {
          userId,
          ...(category ? { category } : {}),
          ...(completed !== undefined ? { isCompleted: completed } : {}),
        },
        orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (entries.length > limit) nextCursor = entries.pop()?.id
      return { entries, nextCursor }
    }),

  // Add a goal (owner only)
  addGoal: authedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        category: z.string().optional(),
        targetDate: z.string().datetime({ offset: true }).optional(), // ISO string
      })
    )
    .mutation(async ({ ctx, input }) => {
      await RATE_LIMITS.showcaseAdd(ctx.session.user.id)
      return ctx.db.goal.create({
        data: {
          userId: ctx.session.user.id,
          title: input.title,
          description: input.description,
          category: input.category,
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
        },
      })
    }),

  // Update a goal (owner only)
  updateGoal: authedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        targetDate: z.string().datetime({ offset: true }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.db.goal.findUnique({ where: { id: input.id } })
      if (!goal || goal.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" })
      }
      return ctx.db.goal.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.targetDate !== undefined ? { targetDate: new Date(input.targetDate) } : {}),
        },
      })
    }),

  // Toggle goal completion
  toggleComplete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.db.goal.findUnique({ where: { id: input.id } })
      if (!goal || goal.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" })
      }
      const nowCompleted = !goal.isCompleted
      const now = new Date()

      let currentStreak = goal.currentStreak
      let longestStreak = goal.longestStreak
      let lastActivityAt: Date | null = goal.lastActivityAt

      if (nowCompleted) {
        const hoursSinceLast = lastActivityAt ? (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60) : Infinity
        currentStreak = hoursSinceLast <= 48 ? currentStreak + 1 : 1
        longestStreak = Math.max(longestStreak, currentStreak)
        lastActivityAt = now
      } else {
        currentStreak = Math.max(0, currentStreak - 1)
      }

      return ctx.db.goal.update({
        where: { id: input.id },
        data: {
          isCompleted: nowCompleted,
          completedAt: nowCompleted ? now : null,
          currentStreak,
          longestStreak,
          lastActivityAt,
        },
      })
    }),

  // Delete a goal (owner only)
  deleteGoal: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.db.goal.findUnique({ where: { id: input.id } })
      if (!goal || goal.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" })
      }
      return ctx.db.goal.delete({ where: { id: input.id } })
    }),

  // Stats
  getStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const goals = await ctx.db.goal.findMany({
        where: { userId: input.userId },
        select: { isCompleted: true, category: true, currentStreak: true, longestStreak: true },
      })
      const total = goals.length
      const completed = goals.filter((g) => g.isCompleted).length
      const categories = [...new Set(goals.map((g) => g.category).filter(Boolean))]
      const maxStreak = goals.reduce((max, g) => Math.max(max, g.longestStreak), 0)
      const activeStreaks = goals.filter((g) => g.currentStreak > 0).length
      return { total, completed, pending: total - completed, categories, maxStreak, activeStreaks }
    }),

  getCategories: publicProcedure.query(() => GOAL_CATEGORIES),
})
