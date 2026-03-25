import { db } from "@/lib/db"
import { redis } from "@/lib/redis"
import { notify } from "@/server/services/notification.service"
import { logger } from "@/lib/logger"

export interface ProcessMentionsPayload {
  postId: string
  authorId: string
  mentionedUserIds: string[]
}

export async function processMentions(payload: ProcessMentionsPayload) {
  const { postId, authorId, mentionedUserIds } = payload

  for (const userId of mentionedUserIds) {
    try {
      await notify({
        db,
        redis,
        recipientId: userId,
        actorId: authorId,
        type: "MENTION",
        entityType: "post",
        entityId: postId,
      })
    } catch (err) {
      logger.error({ err, postId, userId }, "Failed to notify mentioned user")
    }
  }
}
