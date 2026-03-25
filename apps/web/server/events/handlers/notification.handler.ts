import { eventBus } from "../event-bus"
import { notify } from "@/server/services/notification.service"
import { db } from "@/lib/db"
import { redis } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { createQueue } from "@/lib/queue"

const mentionQueue = createQueue("process-mentions")

function safeNotify(...args: Parameters<typeof notify>) {
  notify(...args).catch((err) => logger.error({ err }, "Event handler: notification failed"))
}

export function registerNotificationHandlers() {
  eventBus.on("user.followed", ({ followerId, followingId }) => {
    safeNotify({ db, redis, recipientId: followingId, actorId: followerId, type: "FOLLOW", entityType: "user", entityId: followerId })
  })

  eventBus.on("post.liked", ({ postId, actorId, authorId }) => {
    safeNotify({ db, redis, recipientId: authorId, actorId, type: "LIKE_POST", entityType: "post", entityId: postId })
  })

  eventBus.on("post.shared", ({ postId, actorId, authorId }) => {
    safeNotify({ db, redis, recipientId: authorId, actorId, type: "SHARE", entityType: "post", entityId: postId })
  })

  eventBus.on("comment.created", ({ postId, postAuthorId, actorId }) => {
    safeNotify({ db, redis, recipientId: postAuthorId, actorId, type: "COMMENT", entityType: "post", entityId: postId })
  })

  eventBus.on("post.created", ({ postId, authorId, mentionedUserIds }) => {
    if (mentionedUserIds.length > 0) {
      mentionQueue.add("process-mentions", { postId, authorId, mentionedUserIds }).catch((err) =>
        logger.error({ err, postId }, "Failed to enqueue mention processing")
      )
    }
  })

  eventBus.on("friendRequest.sent", ({ requestId, requesterId, requesteeId }) => {
    safeNotify({ db, redis, recipientId: requesteeId, actorId: requesterId, type: "FRIEND_REQUEST", entityType: "friendRequest", entityId: requestId })
  })

  eventBus.on("friendRequest.accepted", ({ requestId, requesterId, requesteeId }) => {
    safeNotify({ db, redis, recipientId: requesterId, actorId: requesteeId, type: "FRIEND_ACCEPTED", entityType: "friendRequest", entityId: requestId })
  })

  eventBus.on("message.sent", ({ conversationId, senderId, recipientId }) => {
    safeNotify({ db, redis, recipientId, actorId: senderId, type: "MESSAGE", entityType: "conversation", entityId: conversationId })
  })

  eventBus.on("story.viewed", ({ storyId, viewerId, authorId }) => {
    safeNotify({ db, redis, recipientId: authorId, actorId: viewerId, type: "STORY_VIEW", entityType: "story", entityId: storyId })
  })
}
