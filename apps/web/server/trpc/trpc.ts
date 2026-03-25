import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import type { Context } from "./context"

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error && "flatten" in error.cause
            ? (error.cause as { flatten: () => unknown }).flatten()
            : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in" })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session as NonNullable<typeof ctx.session>,
    },
  })
})
