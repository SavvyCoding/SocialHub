import type { PrismaClient } from "@prisma/client"
import { generateEmbedding, buildPostEmbeddingText, buildUserEmbeddingText, EMBEDDING_DIMENSIONS } from "@/lib/embedding"
import { logger } from "@/lib/logger"

function vectorToSql(v: number[]): string {
  return `[${v.join(",")}]`
}

export async function upsertPostEmbedding(db: PrismaClient, postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { name: true, username: true } },
      hashtags: { include: { hashtag: { select: { name: true } } } },
    },
  })
  if (!post || !post.content) return

  const text = buildPostEmbeddingText(post)
  const vector = await generateEmbedding(text)

  await db.$executeRawUnsafe(
    `INSERT INTO embeddings (id, "entityType", "entityId", vector, content, "updatedAt")
     VALUES (gen_random_uuid(), 'POST', $1, $2::vector(${EMBEDDING_DIMENSIONS}), $3, NOW())
     ON CONFLICT ("entityType", "entityId")
     DO UPDATE SET vector = $2::vector(${EMBEDDING_DIMENSIONS}), content = $3, "updatedAt" = NOW()`,
    postId,
    vectorToSql(vector),
    text
  )
}

export async function upsertUserEmbedding(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      skills: { include: { skill: { select: { name: true } } } },
      experiences: { select: { title: true, company: true } },
    },
  })
  if (!user) return

  const text = buildUserEmbeddingText(user)
  const vector = await generateEmbedding(text)

  await db.$executeRawUnsafe(
    `INSERT INTO embeddings (id, "entityType", "entityId", vector, content, "updatedAt")
     VALUES (gen_random_uuid(), 'USER', $1, $2::vector(${EMBEDDING_DIMENSIONS}), $3, NOW())
     ON CONFLICT ("entityType", "entityId")
     DO UPDATE SET vector = $2::vector(${EMBEDDING_DIMENSIONS}), content = $3, "updatedAt" = NOW()`,
    userId,
    vectorToSql(vector),
    text
  )
}

export interface SimilarityResult {
  entityId: string
  distance: number
}

export async function searchSimilarPosts(
  db: PrismaClient,
  query: string,
  options: { limit?: number; excludePostIds?: string[] } = {}
): Promise<SimilarityResult[]> {
  const { limit = 20, excludePostIds = [] } = options
  const vector = await generateEmbedding(query)

  const excludeClause =
    excludePostIds.length > 0
      ? `AND e."entityId" NOT IN (${excludePostIds.map((_, i) => `$${i + 3}`).join(",")})`
      : ""

  const results = await db.$queryRawUnsafe<SimilarityResult[]>(
    `SELECT e."entityId", e.vector <=> $1::vector(${EMBEDDING_DIMENSIONS}) AS distance
     FROM embeddings e
     WHERE e."entityType" = 'POST' ${excludeClause}
     ORDER BY distance ASC
     LIMIT $2`,
    vectorToSql(vector),
    limit,
    ...excludePostIds
  )

  return results
}

export async function searchSimilarUsers(
  db: PrismaClient,
  query: string,
  options: { limit?: number; excludeUserIds?: string[] } = {}
): Promise<SimilarityResult[]> {
  const { limit = 20, excludeUserIds = [] } = options
  const vector = await generateEmbedding(query)

  const excludeClause =
    excludeUserIds.length > 0
      ? `AND e."entityId" NOT IN (${excludeUserIds.map((_, i) => `$${i + 3}`).join(",")})`
      : ""

  const results = await db.$queryRawUnsafe<SimilarityResult[]>(
    `SELECT e."entityId", e.vector <=> $1::vector(${EMBEDDING_DIMENSIONS}) AS distance
     FROM embeddings e
     WHERE e."entityType" = 'USER' ${excludeClause}
     ORDER BY distance ASC
     LIMIT $2`,
    vectorToSql(vector),
    limit,
    ...excludeUserIds
  )

  return results
}

export async function getRecommendedPosts(
  db: PrismaClient,
  userId: string,
  options: { limit?: number; excludePostIds?: string[] } = {}
): Promise<SimilarityResult[]> {
  const { limit = 20, excludePostIds = [] } = options

  const excludeClause =
    excludePostIds.length > 0
      ? `AND e2."entityId" NOT IN (${excludePostIds.map((_, i) => `$${i + 3}`).join(",")})`
      : ""

  const results = await db.$queryRawUnsafe<SimilarityResult[]>(
    `SELECT e2."entityId", e1.vector <=> e2.vector AS distance
     FROM embeddings e1
     JOIN embeddings e2 ON e2."entityType" = 'POST'
     WHERE e1."entityType" = 'USER' AND e1."entityId" = $1
       ${excludeClause}
     ORDER BY distance ASC
     LIMIT $2`,
    userId,
    limit,
    ...excludePostIds
  )

  return results
}

export async function getRecommendedUsers(
  db: PrismaClient,
  userId: string,
  options: { limit?: number; excludeUserIds?: string[] } = {}
): Promise<SimilarityResult[]> {
  const { limit = 20, excludeUserIds = [] } = options

  const allExcluded = [userId, ...excludeUserIds]
  const excludeClause = `AND e2."entityId" NOT IN (${allExcluded.map((_, i) => `$${i + 3}`).join(",")})`

  const results = await db.$queryRawUnsafe<SimilarityResult[]>(
    `SELECT e2."entityId", e1.vector <=> e2.vector AS distance
     FROM embeddings e1
     JOIN embeddings e2 ON e2."entityType" = 'USER'
     WHERE e1."entityType" = 'USER' AND e1."entityId" = $1
       ${excludeClause}
     ORDER BY distance ASC
     LIMIT $2`,
    userId,
    limit,
    ...allExcluded
  )

  return results
}

export async function backfillEmbeddings(db: PrismaClient, batchSize = 50) {
  logger.info("Starting embedding backfill...")

  // Backfill posts
  let postOffset = 0
  let postCount = 0
  while (true) {
    const posts = await db.post.findMany({
      where: {
        content: { not: null },
        NOT: {
          id: {
            in: (
              await db.$queryRaw<{ entityId: string }[]>`
                SELECT "entityId" FROM embeddings WHERE "entityType" = 'POST'
              `
            ).map((r) => r.entityId),
          },
        },
      },
      select: { id: true },
      take: batchSize,
      skip: postOffset,
    })
    if (posts.length === 0) break
    for (const post of posts) {
      try {
        await upsertPostEmbedding(db, post.id)
        postCount++
      } catch (err) {
        logger.error({ postId: post.id, err }, "Failed to embed post")
      }
    }
    postOffset += batchSize
  }

  // Backfill users
  let userOffset = 0
  let userCount = 0
  while (true) {
    const users = await db.user.findMany({
      where: {
        NOT: {
          id: {
            in: (
              await db.$queryRaw<{ entityId: string }[]>`
                SELECT "entityId" FROM embeddings WHERE "entityType" = 'USER'
              `
            ).map((r) => r.entityId),
          },
        },
      },
      select: { id: true },
      take: batchSize,
      skip: userOffset,
    })
    if (users.length === 0) break
    for (const user of users) {
      try {
        await upsertUserEmbedding(db, user.id)
        userCount++
      } catch (err) {
        logger.error({ userId: user.id, err }, "Failed to embed user")
      }
    }
    userOffset += batchSize
  }

  logger.info({ postCount, userCount }, "Embedding backfill complete")
}
