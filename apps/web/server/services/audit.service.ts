import type { PrismaClient, Prisma } from "@prisma/client"
import { logger } from "@/lib/logger"

interface AuditParams {
  db: PrismaClient
  userId: string
  action: string
  resource: string
  resourceId?: string
  meta?: Record<string, unknown>
}

export async function audit({ db, userId, action, resource, resourceId, meta }: AuditParams) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        meta: meta as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    logger.error({ err, userId, action, resource }, "Failed to write audit log")
  }
}
