import type { PrismaClient, NotificationType } from "@prisma/client"
import type Redis from "ioredis"
import { logger } from "@/lib/logger"
import { createQueue } from "@/lib/queue"

const emailQueue = createQueue("email-notifications")

// Only send emails for high-signal notification types
const EMAIL_TYPES: NotificationType[] = [
  "FOLLOW",
  "LIKE_POST",
  "COMMENT",
  "MENTION",
  "FRIEND_REQUEST",
]

interface NotifyParams {
  db: PrismaClient
  redis: Redis
  recipientId: string
  actorId: string
  type: NotificationType
  entityType?: string
  entityId?: string
  data?: import("@prisma/client").Prisma.InputJsonValue
}

export async function notify({
  db,
  redis,
  recipientId,
  actorId,
  type,
  entityType,
  entityId,
  data,
}: NotifyParams) {
  if (recipientId === actorId) return null

  const notification = await db.notification.create({
    data: { recipientId, actorId, type, entityType, entityId, data },
    include: {
      recipient: { select: { id: true } },
    },
  })

  // Publish to Redis so the Socket.IO server can push in real-time
  try {
    await redis.publish(
      `notifications:${recipientId}`,
      JSON.stringify(notification)
    )
  } catch {
    // Non-fatal -- notification is saved to DB regardless
  }

  // Enqueue email notification via BullMQ (retries + backoff handled by worker)
  if (EMAIL_TYPES.includes(type) && process.env.RESEND_API_KEY) {
    emailQueue.add("send-email", { recipientId, actorId, type, entityType, entityId }).catch((err) => logger.error({ err, type, recipientId }, "Failed to enqueue notification email"))
  }

  return notification
}
