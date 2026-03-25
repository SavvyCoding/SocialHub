import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/server/trpc/router/_app"
import { createContext } from "@/server/trpc/context"
import { auth } from "@/lib/auth"
import { initEventHandlers } from "@/server/events"
import { logger } from "@/lib/logger"

// Initialize event handlers once at module load
initEventHandlers()

const handler = async (req: Request) => {
  const session = await auth()
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ session }),  // async — returns Promise<Context>
    onError: ({ path, error }) => {
      logger.error({ path, code: error.code }, `tRPC error on ${path ?? "<no-path>"}`)
    },
  })
}

export { handler as GET, handler as POST }
