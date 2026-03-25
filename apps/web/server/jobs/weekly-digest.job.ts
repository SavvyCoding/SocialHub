import { db } from "@/lib/db"
import { resend, FROM_ADDRESS } from "@/lib/resend"
import { buildWeeklyDigestEmail } from "@/lib/emails/weekly-digest-email"
import { logger } from "@/lib/logger"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function sendWeeklyDigests() {
  if (!resend) {
    logger.warn("RESEND_API_KEY not set — skipping weekly digest")
    return
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Get all users with email addresses
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, username: true },
  })

  logger.info({ count: users.length }, "Sending weekly digests")

  for (const user of users) {
    try {
      const [newFollowers, likeCount, topPosts, suggested] = await Promise.all([
        // New followers this week
        db.follow.count({
          where: { followingId: user.id, createdAt: { gte: oneWeekAgo } },
        }),
        // Total reactions on their posts this week
        db.like.count({
          where: { post: { authorId: user.id }, createdAt: { gte: oneWeekAgo } },
        }),
        // Top 3 posts by engagement this week
        db.post.findMany({
          where: { authorId: user.id, createdAt: { gte: oneWeekAgo }, isPublished: true, parentPostId: null },
          include: { _count: { select: { likes: true, comments: true } } },
          orderBy: [{ likes: { _count: "desc" } }, { comments: { _count: "desc" } }],
          take: 3,
        }),
        // Suggested: active users the person isn't following yet
        db.user.findMany({
          where: {
            id: { not: user.id },
            receivedFollows: { none: { followerId: user.id } },
            posts: { some: { createdAt: { gte: oneWeekAgo } } },
          },
          select: { username: true },
          take: 5,
        }),
      ])

      const { subject, html } = buildWeeklyDigestEmail({
        recipientName: user.name,
        username: user.username,
        newFollowers,
        postLikes: likeCount,
        topPosts: topPosts.map((p) => ({
          id: p.id,
          content: p.content,
          likeCount: p._count.likes,
          commentCount: p._count.comments,
          authorName: user.name,
        })),
        suggestedUsernames: suggested.map((u) => u.username),
      })

      await resend.emails.send({
        from: FROM_ADDRESS,
        to: user.email,
        subject,
        html,
      })

      logger.debug({ userId: user.id }, "Weekly digest sent")
    } catch (err) {
      logger.error({ userId: user.id, err }, "Failed to send weekly digest")
    }
  }

  logger.info("Weekly digest batch complete")
}
