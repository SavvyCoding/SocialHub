import type { NotificationType } from "@prisma/client"
import { db } from "@/lib/db"
import { resend, FROM_ADDRESS } from "@/lib/resend"
import { getSubjectAndBody } from "@/lib/emails/notification-email"
import { logger } from "@/lib/logger"

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export interface EmailNotificationPayload {
  recipientId: string
  actorId: string
  type: NotificationType
  entityType?: string
  entityId?: string
}

export async function processEmailNotification(payload: EmailNotificationPayload) {
  const { recipientId, actorId, type, entityType, entityId } = payload

  const [recipient, actor] = await Promise.all([
    db.user.findUnique({ where: { id: recipientId }, select: { name: true, email: true } }),
    db.user.findUnique({ where: { id: actorId }, select: { name: true, username: true } }),
  ])

  if (!recipient?.email || !actor) return

  const emailContent = getSubjectAndBody({
    recipientName: recipient.name,
    actorName: actor.name,
    actorUsername: actor.username,
    type,
    appUrl: APP_URL,
    entityType,
    entityId,
  })

  if (!emailContent || !resend) return

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: recipient.email,
    subject: emailContent.subject,
    html: emailContent.html,
  })

  logger.info({ type, recipientId }, "Notification email sent")
}
