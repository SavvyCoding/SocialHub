import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure, publicProcedure } from "../trpc"

export const profileRouter = router({
  // ─── Experience ───────────────────────────────────────────────

  getExperiences: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.experience.findMany({
        where: { userId: input.userId },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      })
    ),

  addExperience: authedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        company: z.string().min(1).max(100),
        location: z.string().max(100).optional(),
        startDate: z.string(), // ISO string
        endDate: z.string().optional(),
        isCurrent: z.boolean().default(false),
        description: z.string().max(1000).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.db.experience.create({
        data: {
          userId: ctx.session.user.id,
          title: input.title,
          company: input.company,
          location: input.location,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          isCurrent: input.isCurrent,
          description: input.description,
        },
      })
    ),

  updateExperience: authedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(100).optional(),
        company: z.string().min(1).max(100).optional(),
        location: z.string().max(100).optional(),
        startDate: z.string().optional(),
        endDate: z.string().nullable().optional(),
        isCurrent: z.boolean().optional(),
        description: z.string().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const exp = await ctx.db.experience.findUnique({ where: { id: input.id } })
      if (!exp || exp.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      const { id, startDate, endDate, ...rest } = input
      return ctx.db.experience.update({
        where: { id },
        data: {
          ...rest,
          ...(startDate ? { startDate: new Date(startDate) } : {}),
          ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        },
      })
    }),

  deleteExperience: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const exp = await ctx.db.experience.findUnique({ where: { id: input.id } })
      if (!exp || exp.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      await ctx.db.experience.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // ─── Education ────────────────────────────────────────────────

  getEducations: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.education.findMany({
        where: { userId: input.userId },
        orderBy: [{ endYear: "desc" }, { startYear: "desc" }],
      })
    ),

  addEducation: authedProcedure
    .input(
      z.object({
        school: z.string().min(1).max(100),
        degree: z.string().max(100).optional(),
        field: z.string().max(100).optional(),
        startYear: z.number().int().min(1900).max(2100),
        endYear: z.number().int().min(1900).max(2100).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.db.education.create({ data: { userId: ctx.session.user.id, ...input } })
    ),

  updateEducation: authedProcedure
    .input(
      z.object({
        id: z.string(),
        school: z.string().min(1).max(100).optional(),
        degree: z.string().max(100).nullable().optional(),
        field: z.string().max(100).nullable().optional(),
        startYear: z.number().int().min(1900).max(2100).optional(),
        endYear: z.number().int().min(1900).max(2100).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const edu = await ctx.db.education.findUnique({ where: { id: input.id } })
      if (!edu || edu.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      const { id, ...rest } = input
      return ctx.db.education.update({ where: { id }, data: rest })
    }),

  deleteEducation: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const edu = await ctx.db.education.findUnique({ where: { id: input.id } })
      if (!edu || edu.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      await ctx.db.education.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // ─── Skills ───────────────────────────────────────────────────

  getSkills: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.userSkill.findMany({
        where: { userId: input.userId },
        include: {
          skill: true,
          _count: { select: { endorsements: true } },
          endorsements: {
            where: { endorserId: ctx.session?.user?.id ?? "" }, // pass viewer id for "did I endorse?"
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { endorsements: { _count: "desc" } },
      })
    ),

  addSkill: authedProcedure
    .input(z.object({ name: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const skill = await ctx.db.skill.upsert({
        where: { name: input.name.toLowerCase() },
        create: { name: input.name.toLowerCase() },
        update: {},
      })
      return ctx.db.userSkill.upsert({
        where: { userId_skillId: { userId: ctx.session.user.id, skillId: skill.id } },
        create: { userId: ctx.session.user.id, skillId: skill.id },
        update: {},
        include: { skill: true, _count: { select: { endorsements: true } } },
      })
    }),

  removeSkill: authedProcedure
    .input(z.object({ userSkillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const us = await ctx.db.userSkill.findUnique({ where: { id: input.userSkillId } })
      if (!us || us.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      await ctx.db.userSkill.delete({ where: { id: input.userSkillId } })
      return { success: true }
    }),

  endorseSkill: authedProcedure
    .input(z.object({ userSkillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const endorserId = ctx.session.user.id
      const us = await ctx.db.userSkill.findUnique({ where: { id: input.userSkillId } })
      if (!us) throw new TRPCError({ code: "NOT_FOUND" })
      if (us.userId === endorserId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot endorse your own skill" })

      const existing = await ctx.db.endorsement.findUnique({
        where: { userSkillId_endorserId: { userSkillId: input.userSkillId, endorserId } },
      })
      if (existing) {
        await ctx.db.endorsement.delete({ where: { id: existing.id } })
        return { endorsed: false }
      }
      await ctx.db.endorsement.create({ data: { userSkillId: input.userSkillId, endorserId } })
      return { endorsed: true }
    }),

  // ─── Profile completeness ─────────────────────────────────────

  getCompleteness: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const [user, expCount, eduCount, skillCount] = await Promise.all([
      ctx.db.user.findUnique({
        where: { id: userId },
        select: { name: true, bio: true, avatarUrl: true, coverUrl: true, location: true, website: true },
      }),
      ctx.db.experience.count({ where: { userId } }),
      ctx.db.education.count({ where: { userId } }),
      ctx.db.userSkill.count({ where: { userId } }),
    ])

    const checks = [
      { label: "Profile photo", done: !!user?.avatarUrl },
      { label: "Cover photo", done: !!user?.coverUrl },
      { label: "Bio", done: !!user?.bio },
      { label: "Location", done: !!user?.location },
      { label: "Website", done: !!user?.website },
      { label: "Work experience", done: expCount > 0 },
      { label: "Education", done: eduCount > 0 },
      { label: "Skills (3+)", done: skillCount >= 3 },
    ]

    const percent = Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
    return { percent, checks }
  }),

  // ─── Edit own profile ─────────────────────────────────────────

  updateProfile: authedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50).optional(),
        bio: z.string().max(200).optional(),
        location: z.string().max(100).optional(),
        website: z.string().url().optional().or(z.literal("")),
        avatarUrl: z.string().url().optional(),
        coverUrl: z.string().url().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: { id: true, name: true, username: true, bio: true, avatarUrl: true, coverUrl: true, location: true, website: true },
      })
    ),
})
