export type DomainEvents = {
  "post.created": { postId: string; authorId: string; mentionedUserIds: string[] }
  "post.deleted": { postId: string; authorId: string }
  "post.liked": { postId: string; actorId: string; authorId: string }
  "post.shared": { postId: string; actorId: string; authorId: string }
  "comment.created": { commentId: string; postId: string; postAuthorId: string; actorId: string }
  "user.followed": { followerId: string; followingId: string }
  "user.unfollowed": { followerId: string; followingId: string }
  "user.blocked": { blockerId: string; blockedId: string }
  "user.unblocked": { blockerId: string; blockedId: string }
  "user.muted": { muterId: string; mutedId: string }
  "user.unmuted": { muterId: string; mutedId: string }
  "message.sent": { messageId: string; conversationId: string; senderId: string; recipientId: string }
  "friendRequest.sent": { requestId: string; requesterId: string; requesteeId: string }
  "friendRequest.accepted": { requestId: string; requesterId: string; requesteeId: string }
  "story.viewed": { storyId: string; viewerId: string; authorId: string }
}
