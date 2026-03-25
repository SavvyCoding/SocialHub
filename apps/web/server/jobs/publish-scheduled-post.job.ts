import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { eventBus } from "@/server/events/event-bus"

export interface PublishScheduledPostPayload {
  postId: string
}

export async function publishScheduledPost(payload: PublishScheduledPostPayload) {
  const { postId } = payload

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, isPublished: true },
  })

  if (!post) {
    logger.warn({ postId }, "Scheduled post not found, skipping publish")
    return
  }

  if (post.isPublished) {
    logger.debug({ postId }, "Post already published, skipping")
    return
  }

  await db.post.update({
    where: { id: postId },
    data: { isPublished: true },
  })

  // Emit post.created to trigger mentions, notifications, embeddings
  const mentions = await db.postMention.findMany({
    where: { postId },
    select: { userId: true },
  })

  eventBus.emit("post.created", {
    postId: post.id,
    authorId: post.authorId,
    mentionedUserIds: mentions.map((m) => m.userId),
  })

  logger.info({ postId }, "Scheduled post published")
}
