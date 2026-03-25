import type { NotificationType } from "@prisma/client"

interface EmailContext {
  recipientName: string
  actorName: string
  actorUsername: string
  type: NotificationType
  appUrl: string
  entityId?: string
  entityType?: string
}

function getSubjectAndBody(ctx: EmailContext): { subject: string; html: string } | null {
  const { recipientName, actorName, actorUsername, type, appUrl } = ctx
  const actorUrl = `${appUrl}/profile/${actorUsername}`
  const profileLink = `<a href="${actorUrl}" style="color:#6366f1;text-decoration:none;font-weight:600;">${actorName}</a>`

  const wrapper = (content: string, subject: string) => ({
    subject,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr>
      <td style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <div style="margin-bottom:24px;">
          <span style="font-size:24px;font-weight:800;color:#09090b;letter-spacing:-0.5px;">SocialHub</span>
        </div>
        ${content}
        <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
        <p style="font-size:12px;color:#71717a;margin:0;">
          You're receiving this because you have notifications enabled on SocialHub.
          <a href="${appUrl}/settings" style="color:#6366f1;">Manage preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })

  switch (type) {
    case "FOLLOW":
      return wrapper(
        `<p style="font-size:16px;color:#09090b;margin:0 0 16px;">👋 Hi ${recipientName},</p>
         <p style="font-size:16px;color:#3f3f46;margin:0 0 20px;">${profileLink} started following you.</p>
         <a href="${actorUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Profile</a>`,
        `${actorName} started following you`
      )

    case "LIKE_POST":
      return wrapper(
        `<p style="font-size:16px;color:#09090b;margin:0 0 16px;">❤️ Hi ${recipientName},</p>
         <p style="font-size:16px;color:#3f3f46;margin:0 0 20px;">${profileLink} liked your post.</p>
         <a href="${appUrl}/feed" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">See your post</a>`,
        `${actorName} liked your post`
      )

    case "COMMENT":
      return wrapper(
        `<p style="font-size:16px;color:#09090b;margin:0 0 16px;">💬 Hi ${recipientName},</p>
         <p style="font-size:16px;color:#3f3f46;margin:0 0 20px;">${profileLink} commented on your post.</p>
         <a href="${appUrl}/feed" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View comment</a>`,
        `${actorName} commented on your post`
      )

    case "MENTION":
      return wrapper(
        `<p style="font-size:16px;color:#09090b;margin:0 0 16px;">📣 Hi ${recipientName},</p>
         <p style="font-size:16px;color:#3f3f46;margin:0 0 20px;">${profileLink} mentioned you in a post.</p>
         <a href="${appUrl}/feed" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View post</a>`,
        `${actorName} mentioned you`
      )

    case "LIKE_COMMENT":
      return wrapper(
        `<p style="font-size:16px;color:#09090b;margin:0 0 16px;">❤️ Hi ${recipientName},</p>
         <p style="font-size:16px;color:#3f3f46;margin:0 0 20px;">${profileLink} liked your comment.</p>
         <a href="${appUrl}/feed" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">See your comment</a>`,
        `${actorName} liked your comment`
      )

    case "FRIEND_REQUEST":
      return wrapper(
        `<p style="font-size:16px;color:#09090b;margin:0 0 16px;">🤝 Hi ${recipientName},</p>
         <p style="font-size:16px;color:#3f3f46;margin:0 0 20px;">${profileLink} sent you a friend request.</p>
         <a href="${actorUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View request</a>`,
        `${actorName} sent you a friend request`
      )

    default:
      return null
  }
}

export { getSubjectAndBody }
export type { EmailContext }
