import { eventBus } from "../event-bus"
import { createQueue } from "@/lib/queue"
import type { GenerateEmbeddingPayload } from "@/server/jobs/generate-embedding.job"

const embeddingQueue = createQueue("generate-embeddings")

export function registerEmbeddingHandlers() {
  eventBus.on("post.created", async ({ postId }) => {
    await embeddingQueue.add("embed-post", {
      entityType: "POST",
      entityId: postId,
    } satisfies GenerateEmbeddingPayload)
  })

  eventBus.on("user.followed", async ({ followerId }) => {
    // Re-embed the follower's profile since social context changed
    await embeddingQueue.add("embed-user", {
      entityType: "USER",
      entityId: followerId,
    } satisfies GenerateEmbeddingPayload)
  })
}
