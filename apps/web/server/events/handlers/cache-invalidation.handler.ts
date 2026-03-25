import { eventBus } from "../event-bus"
import { redis } from "@/lib/redis"
import { logger } from "@/lib/logger"

async function invalidateUserCaches(userId: string) {
  try {
    await redis.del(`cache:following:${userId}`, `cache:excluded:${userId}`)
  } catch (err) {
    logger.error({ err, userId }, "Failed to invalidate user caches")
  }
}

export function registerCacheInvalidationHandlers() {
  eventBus.on("user.followed", ({ followerId }) => {
    invalidateUserCaches(followerId)
  })

  eventBus.on("user.unfollowed", ({ followerId }) => {
    invalidateUserCaches(followerId)
  })

  eventBus.on("user.blocked", ({ blockerId, blockedId }) => {
    Promise.all([invalidateUserCaches(blockerId), invalidateUserCaches(blockedId)])
  })

  eventBus.on("user.unblocked", ({ blockerId }) => {
    invalidateUserCaches(blockerId)
  })

  eventBus.on("user.muted", ({ muterId }) => {
    invalidateUserCaches(muterId)
  })

  eventBus.on("user.unmuted", ({ muterId }) => {
    invalidateUserCaches(muterId)
  })

  eventBus.on("friendRequest.accepted", ({ requesterId, requesteeId }) => {
    Promise.all([invalidateUserCaches(requesterId), invalidateUserCaches(requesteeId)])
  })
}
