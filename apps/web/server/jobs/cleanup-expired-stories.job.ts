import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export async function cleanupExpiredStories() {
  const result = await db.story.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  if (result.count > 0) {
    logger.info({ count: result.count }, "Cleaned up expired stories")
  }
}
