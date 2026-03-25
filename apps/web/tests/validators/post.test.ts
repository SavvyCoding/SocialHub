import { describe, it, expect } from "vitest"
import { createPostSchema, getFeedSchema } from "@/lib/validators/post"

describe("createPostSchema", () => {
  it("accepts a text-only post", () => {
    expect(createPostSchema.safeParse({ content: "Hello world" }).success).toBe(true)
  })

  it("accepts a media-only post with no content", () => {
    expect(
      createPostSchema.safeParse({ mediaUrls: ["https://example.com/photo.png"] }).success
    ).toBe(true)
  })

  it("accepts a post with both content and media", () => {
    expect(
      createPostSchema.safeParse({
        content: "Check this out!",
        mediaUrls: ["https://example.com/photo.png"],
      }).success
    ).toBe(true)
  })

  it("rejects a post with neither content nor media", () => {
    expect(createPostSchema.safeParse({}).success).toBe(false)
  })

  it("rejects whitespace-only content with no media", () => {
    expect(createPostSchema.safeParse({ content: "   " }).success).toBe(false)
  })

  it("rejects content longer than 2000 characters", () => {
    expect(createPostSchema.safeParse({ content: "a".repeat(2001) }).success).toBe(false)
  })

  it("accepts content of exactly 2000 characters", () => {
    expect(createPostSchema.safeParse({ content: "a".repeat(2000) }).success).toBe(true)
  })

  it("rejects more than 4 media URLs", () => {
    expect(
      createPostSchema.safeParse({
        mediaUrls: [
          "https://example.com/1.png",
          "https://example.com/2.png",
          "https://example.com/3.png",
          "https://example.com/4.png",
          "https://example.com/5.png",
        ],
      }).success
    ).toBe(false)
  })

  it("accepts exactly 4 media URLs", () => {
    expect(
      createPostSchema.safeParse({
        mediaUrls: [
          "https://example.com/1.png",
          "https://example.com/2.png",
          "https://example.com/3.png",
          "https://example.com/4.png",
        ],
      }).success
    ).toBe(true)
  })

  it("rejects an invalid URL in mediaUrls", () => {
    expect(createPostSchema.safeParse({ mediaUrls: ["not-a-url"] }).success).toBe(false)
  })

  it("defaults visibility to PUBLIC", () => {
    const result = createPostSchema.safeParse({ content: "Hello" })
    expect(result.success && result.data.visibility).toBe("PUBLIC")
  })

  it("accepts all valid visibility values", () => {
    for (const vis of ["PUBLIC", "FOLLOWERS", "CONNECTIONS", "PRIVATE"] as const) {
      expect(createPostSchema.safeParse({ content: "Hello", visibility: vis }).success).toBe(true)
    }
  })

  it("rejects an invalid visibility value", () => {
    expect(createPostSchema.safeParse({ content: "Hello", visibility: "INVALID" }).success).toBe(false)
  })
})

describe("getFeedSchema", () => {
  it("defaults limit to 20 when no input provided", () => {
    const result = getFeedSchema.safeParse({})
    expect(result.success && result.data.limit).toBe(20)
  })

  it("accepts a valid cursor string", () => {
    const result = getFeedSchema.safeParse({ cursor: "clxyz123" })
    expect(result.success).toBe(true)
  })

  it("accepts custom limit within range", () => {
    expect(getFeedSchema.safeParse({ limit: 10 }).success).toBe(true)
    expect(getFeedSchema.safeParse({ limit: 50 }).success).toBe(true)
    expect(getFeedSchema.safeParse({ limit: 1 }).success).toBe(true)
  })

  it("rejects limit above 50", () => {
    expect(getFeedSchema.safeParse({ limit: 51 }).success).toBe(false)
  })

  it("rejects limit below 1", () => {
    expect(getFeedSchema.safeParse({ limit: 0 }).success).toBe(false)
  })
})
