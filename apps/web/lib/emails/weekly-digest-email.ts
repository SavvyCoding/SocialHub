const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

interface DigestPost {
  id: string
  content: string | null
  likeCount: number
  commentCount: number
  authorName: string
}

interface WeeklyDigestContext {
  recipientName: string
  username: string
  newFollowers: number
  postLikes: number
  topPosts: DigestPost[]
  suggestedUsernames: string[]
}

export function buildWeeklyDigestEmail(ctx: WeeklyDigestContext): { subject: string; html: string } {
  const { recipientName, username, newFollowers, postLikes, topPosts, suggestedUsernames } = ctx

  const postsHtml = topPosts.length
    ? topPosts
        .map(
          (p) => `
      <div style="border:1px solid #e4e4e7;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
        <p style="font-size:14px;color:#3f3f46;margin:0 0 8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
          ${p.content ? p.content.slice(0, 140) : "<em style='color:#a1a1aa;'>No caption</em>"}
        </p>
        <span style="font-size:12px;color:#71717a;">❤️ ${p.likeCount} · 💬 ${p.commentCount}</span>
      </div>`
        )
        .join("")
    : `<p style="font-size:14px;color:#71717a;margin:0;">No posts this week. Share something!</p>`

  const suggestHtml = suggestedUsernames.length
    ? suggestedUsernames
        .map(
          (u) =>
            `<a href="${APP_URL}/profile/${u}" style="display:inline-block;margin:3px;padding:4px 10px;border:1px solid #e4e4e7;border-radius:999px;font-size:13px;color:#6366f1;text-decoration:none;">@${u}</a>`
        )
        .join("")
    : ""

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr>
      <td style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <div style="margin-bottom:24px;">
          <span style="font-size:24px;font-weight:800;color:#09090b;letter-spacing:-0.5px;">SocialHub</span>
          <span style="font-size:13px;color:#71717a;margin-left:8px;">Weekly Digest</span>
        </div>

        <p style="font-size:16px;color:#09090b;margin:0 0 8px;">👋 Hi ${recipientName},</p>
        <p style="font-size:14px;color:#71717a;margin:0 0 24px;">Here's what happened on your profile this week.</p>

        <!-- Stats row -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="background:#f4f4f5;border-radius:10px;padding:14px 16px;text-align:center;width:50%;">
              <p style="font-size:28px;font-weight:800;color:#6366f1;margin:0;">${newFollowers}</p>
              <p style="font-size:12px;color:#71717a;margin:4px 0 0;">new follower${newFollowers !== 1 ? "s" : ""}</p>
            </td>
            <td style="width:12px;"></td>
            <td style="background:#f4f4f5;border-radius:10px;padding:14px 16px;text-align:center;width:50%;">
              <p style="font-size:28px;font-weight:800;color:#6366f1;margin:0;">${postLikes}</p>
              <p style="font-size:12px;color:#71717a;margin:4px 0 0;">reaction${postLikes !== 1 ? "s" : ""} on your posts</p>
            </td>
          </tr>
        </table>

        <!-- Top posts -->
        <p style="font-size:14px;font-weight:600;color:#09090b;margin:0 0 10px;">Your posts this week</p>
        ${postsHtml}

        ${
          suggestHtml
            ? `<p style="font-size:14px;font-weight:600;color:#09090b;margin:24px 0 10px;">People to follow</p>
               <div>${suggestHtml}</div>`
            : ""
        }

        <div style="text-align:center;margin-top:28px;">
          <a href="${APP_URL}/posts" style="display:inline-block;background:#6366f1;color:#fff;padding:11px 28px;border-radius:9px;text-decoration:none;font-weight:600;font-size:14px;">
            Open SocialHub
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0 16px;">
        <p style="font-size:12px;color:#71717a;margin:0;">
          You're receiving this weekly digest as <strong>@${username}</strong>.
          <a href="${APP_URL}/settings" style="color:#6366f1;">Manage preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject: `Your SocialHub week in review`, html }
}
