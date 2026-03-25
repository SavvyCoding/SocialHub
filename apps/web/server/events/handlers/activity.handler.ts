import { eventBus } from "../event-bus"
import { db } from "@/lib/db"
import { redis } from "@/lib/redis"
import { logger } from "@/lib/logger"

async function broadcastActivityToFollowers(authorId: string, payload: object) {
  try {
    const followers = await db.follow.findMany({
      where: { followingId: authorId },
      select: { followerId: true },
      take: 500, // cap to avoid massive fan-out
    })
    const pipeline = redis.pipeline()
    for (const { followerId } of followers) {
      pipeline.publish(`activity:${followerId}`, JSON.stringify(payload))
    }
    await pipeline.exec()
  } catch (err) {
    logger.error({ err, authorId }, "Activity broadcast failed")
  }
}

export function registerActivityHandlers() {
  eventBus.on("post.created", async ({ postId, authorId }) => {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { content: true, author: { select: { name: true, username: true, avatarUrl: true, isVerified: true } } },
    })
    if (!post) return
    await broadcastActivityToFollowers(authorId, {
      id: `post-${postId}`,
      type: "post",
      actorName: post.author.name,
      actorUsername: post.author.username,
      actorAvatar: post.author.avatarUrl,
      actorVerified: post.author.isVerified,
      text: post.content?.slice(0, 80) ?? "",
      postId,
      createdAt: new Date().toISOString(),
    })
  })

  eventBus.on("post.liked", async ({ postId, actorId }) => {
    const [actor, post] = await Promise.all([
      db.user.findUnique({
        where: { id: actorId },
        select: { name: true, username: true, avatarUrl: true, isVerified: true },
      }),
      db.post.findUnique({ where: { id: postId }, select: { content: true, authorId: true } }),
    ])
    if (!actor || !post) return
    await broadcastActivityToFollowers(actorId, {
      id: `like-${actorId}-${postId}`,
      type: "like",
      actorName: actor.name,
      actorUsername: actor.username,
      actorAvatar: actor.avatarUrl,
      actorVerified: actor.isVerified,
      text: post.content?.slice(0, 60) ?? "",
      postId,
      createdAt: new Date().toISOString(),
    })
  })
}
