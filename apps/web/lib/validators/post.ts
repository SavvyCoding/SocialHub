import { z } from "zod"

export const pollSchema = z.object({
  question: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(100)).min(2).max(4),
})

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Post cannot be empty")
    .max(2000, "Post cannot exceed 2000 characters")
    .optional(),
  mediaUrls: z.array(z.string().url()).max(4, "Maximum 4 images per post").optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "CONNECTIONS", "PRIVATE"]).default("PUBLIC"),
  poll: pollSchema.optional(),
  scheduledAt: z.date().optional(),
}).refine(
  (data) =>
    (data.content && data.content.trim().length > 0) ||
    (data.mediaUrls && data.mediaUrls.length > 0) ||
    data.poll != null,
  { message: "Post must have content, media, or a poll" }
)

export const getFeedSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type GetFeedInput = z.infer<typeof getFeedSchema>
