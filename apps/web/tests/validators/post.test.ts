import { describe, it, expect } from "vitest"
import { createPostSchema, getFeedSchema, pollSchema } from "@/lib/validators/post"

// ─── pollSchema ───────────────────────────────────────────────────────────────

describe("pollSchema", () => {
  it("accepts a valid poll with 2 options", () => {
    expect(pollSchema.safeParse({ question: "Cats or dogs?", options: ["Cats", "Dogs"] }).success).toBe(true)
  })

  it("accepts a valid poll with up to 4 options", () => {
    expect(
      pollSchema.safeParse({ question: "Pick one", options: ["A", "B", "C", "D"] }).success
    ).toBe(true)
  })

  it("rejects a poll with fewer than 2 options", () => {
    expect(pollSchema.safeParse({ question: "Single option?", options: ["Only one"] }).success).toBe(false)
  })

  it("rejects a poll with more than 4 options", () => {
    expect(
      pollSchema.safeParse({ question: "Too many", options: ["A", "B", "C", "D", "E"] }).success
    ).toBe(false)
  })

  it("rejects a poll with an empty question", () => {
    expect(pollSchema.safeParse({ question: "", options: ["A", "B"] }).success).toBe(false)
  })

  it("rejects a poll with an empty option", () => {
    expect(pollSchema.safeParse({ question: "Valid?", options: ["", "B"] }).success).toBe(false)
  })

  it("rejects a question longer than 200 characters", () => {
    expect(pollSchema.safeParse({ question: "q".repeat(201), options: ["A", "B"] }).success).toBe(false)
  })

  it("rejects an option longer than 100 characters", () => {
    expect(pollSchema.safeParse({ question: "Valid?", options: ["a".repeat(101), "B"] }).success).toBe(false)
  })
})

// ─── createPostSchema ─────────────────────────────────────────────────────────

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

  it("accepts a poll-only post with no content or media", () => {
    expect(
      createPostSchema.safeParse({
        poll: { question: "Favorite season?", options: ["Spring", "Summer", "Autumn", "Winter"] },
      }).success
    ).toBe(true)
  })

  it("accepts a post with content and a poll", () => {
    expect(
      createPostSchema.safeParse({
        content: "Vote below!",
        poll: { question: "Best framework?", options: ["React", "Vue"] },
      }).success
    ).toBe(true)
  })

  it("accepts a post with a scheduledAt date", () => {
    expect(
      createPostSchema.safeParse({
        content: "Future post",
        scheduledAt: new Date(Date.now() + 3_600_000),
      }).success
    ).toBe(true)
  })

  it("rejects a post with neither content, media, nor poll", () => {
    expect(createPostSchema.safeParse({}).success).toBe(false)
  })

  it("rejects whitespace-only content with no media or poll", () => {
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

  it("rejects a poll with only 1 option", () => {
    expect(
      createPostSchema.safeParse({
        content: "Vote",
        poll: { question: "Only one?", options: ["Just me"] },
      }).success
    ).toBe(false)
  })
})

// ─── getFeedSchema ────────────────────────────────────────────────────────────

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
