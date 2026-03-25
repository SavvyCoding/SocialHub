import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { upsertPostEmbedding, upsertUserEmbedding } from "@/server/services/embedding.service"

export interface GenerateEmbeddingPayload {
  entityType: "POST" | "USER"
  entityId: string
}

export async function processEmbedding(payload: GenerateEmbeddingPayload) {
  const { entityType, entityId } = payload

  try {
    if (entityType === "POST") {
      await upsertPostEmbedding(db, entityId)
    } else {
      await upsertUserEmbedding(db, entityId)
    }
    logger.debug({ entityType, entityId }, "Embedding generated")
  } catch (err) {
    logger.error({ entityType, entityId, err }, "Failed to generate embedding")
    throw err
  }
}
