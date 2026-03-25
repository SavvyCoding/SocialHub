import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure, authedProcedure } from "../trpc"
import { redis } from "@/lib/redis"
import { RATE_LIMITS } from "@/lib/rate-limit"

export const placeRouter = router({
  // Geocoding search proxy (Mapbox) with Redis cache
  geocode: authedProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ input }) => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (!token) return []

      const cacheKey = `mapbox:geocode:${input.q.toLowerCase().trim()}`
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached as string)

      const encoded = encodeURIComponent(input.q)
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&types=place,country,region,locality&limit=5`

      const res = await fetch(url)
      if (!res.ok) return []
      const data = await res.json()

      const results = (data.features ?? []).map((f: {
        id: string
        place_name: string
        center: [number, number]
        context?: Array<{ id: string; text: string }>
      }) => ({
        id: f.id,
        name: f.place_name.split(",")[0].trim(),
        fullName: f.place_name,
        longitude: f.center[0],
        latitude: f.center[1],
        country: f.context?.find((c) => c.id.startsWith("country"))?.text ?? "",
        city: f.context?.find((c) => c.id.startsWith("place") || c.id.startsWith("locality"))?.text,
      }))

      await redis.set(cacheKey, JSON.stringify(results), "EX", 86400) // cache 24h
      return results
    }),

  // Get places for a user (public, paginated)
  getPlaces: publicProcedure
    .input(z.object({
      userId: z.string(),
      cursor: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { userId, cursor, limit } = input
      const entries = await ctx.db.place.findMany({
        where: { userId },
        orderBy: [{ visitedAt: "desc" }, { createdAt: "desc" }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (entries.length > limit) nextCursor = entries.pop()?.id
      return { entries, nextCursor }
    }),

  // Add a place (owner only)
  addPlace: authedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        country: z.string().min(1),
        city: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        visitedAt: z.string().datetime({ offset: true }).optional(), // ISO string
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await RATE_LIMITS.showcaseAdd(ctx.session.user.id)
      return ctx.db.place.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          country: input.country,
          city: input.city,
          latitude: input.latitude,
          longitude: input.longitude,
          visitedAt: input.visitedAt ? new Date(input.visitedAt) : null,
          notes: input.notes,
        },
      })
    }),

  // Update a place (owner only)
  updatePlace: authedProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
        visitedAt: z.string().datetime({ offset: true }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const place = await ctx.db.place.findUnique({ where: { id: input.id } })
      if (!place || place.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" })
      }
      return ctx.db.place.update({
        where: { id: input.id },
        data: {
          notes: input.notes,
          visitedAt: input.visitedAt ? new Date(input.visitedAt) : undefined,
        },
      })
    }),

  // Delete a place (owner only)
  deletePlace: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const place = await ctx.db.place.findUnique({ where: { id: input.id } })
      if (!place || place.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" })
      }
      return ctx.db.place.delete({ where: { id: input.id } })
    }),

  // Stats
  getStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const places = await ctx.db.place.findMany({
        where: { userId: input.userId },
        select: { country: true },
      })
      const countries = new Set(places.map((p) => p.country))
      return {
        total: places.length,
        countries: countries.size,
      }
    }),
})
