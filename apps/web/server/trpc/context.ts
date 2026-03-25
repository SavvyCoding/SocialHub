import type { Session } from "next-auth"
import { db } from "@/lib/db"
import { redis } from "@/lib/redis"

export interface Context {
  session: Session | null
  db: typeof db
  redis: typeof redis
}

export async function createContext({ session }: { session: Session | null }): Promise<Context> {
  // If there is a session but the user no longer exists in the DB (e.g. after
  // re-seeding), treat the request as unauthenticated so callers get a clean
  // UNAUTHORIZED error instead of a foreign-key crash.
  if (session?.user?.id) {
    const exists = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    })
    if (!exists) {
      return { session: null, db, redis }
    }
  }

  return { session, db, redis }
}
