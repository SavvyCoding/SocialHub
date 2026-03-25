import { describe, it, expect, vi, afterEach } from "vitest"
import { extractHashtags, extractMentions, formatRelativeTime } from "@/lib/utils"

describe("extractHashtags", () => {
  it("returns an empty array when no hashtags present", () => {
    expect(extractHashtags("hello world")).toEqual([])
  })

  it("extracts a single hashtag", () => {
    expect(extractHashtags("hello #world")).toEqual(["world"])
  })

  it("extracts multiple hashtags", () => {
    expect(extractHashtags("#hello #world #coding")).toEqual(["hello", "world", "coding"])
  })

  it("deduplicates repeated hashtags", () => {
    expect(extractHashtags("#hello #hello #world")).toEqual(["hello", "world"])
  })

  it("lowercases all hashtags", () => {
    expect(extractHashtags("#Hello #WORLD")).toEqual(["hello", "world"])
  })

  it("handles hashtags with underscores and digits", () => {
    expect(extractHashtags("#web_dev #js2024")).toEqual(["web_dev", "js2024"])
  })

  it("returns empty array for empty string", () => {
    expect(extractHashtags("")).toEqual([])
  })
})

describe("extractMentions", () => {
  it("returns an empty array when no mentions present", () => {
    expect(extractMentions("hello world")).toEqual([])
  })

  it("extracts a single mention", () => {
    expect(extractMentions("hello @alice")).toEqual(["alice"])
  })

  it("extracts multiple mentions", () => {
    expect(extractMentions("@alice and @bob are here")).toEqual(["alice", "bob"])
  })

  it("deduplicates repeated mentions", () => {
    expect(extractMentions("@alice and @alice again")).toEqual(["alice"])
  })

  it("lowercases all mentions", () => {
    expect(extractMentions("@Alice @BOB")).toEqual(["alice", "bob"])
  })

  it("handles mentions with underscores and digits", () => {
    expect(extractMentions("@john_doe @user99")).toEqual(["john_doe", "user99"])
  })

  it("returns empty array for empty string", () => {
    expect(extractMentions("")).toEqual([])
  })
})

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 'just now' for times under 60 seconds ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T12:00:30Z"))
    expect(formatRelativeTime(new Date("2024-06-01T12:00:00Z"))).toBe("just now")
  })

  it("returns minutes for 1–59 minutes ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T12:30:00Z"))
    expect(formatRelativeTime(new Date("2024-06-01T12:00:00Z"))).toBe("30m")
  })

  it("returns hours for 1–23 hours ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T15:00:00Z"))
    expect(formatRelativeTime(new Date("2024-06-01T12:00:00Z"))).toBe("3h")
  })

  it("returns days for 1–6 days ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-04T12:00:00Z"))
    expect(formatRelativeTime(new Date("2024-06-01T12:00:00Z"))).toBe("3d")
  })

  it("returns a formatted date for 7+ days ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-20T12:00:00Z"))
    const result = formatRelativeTime(new Date("2024-06-01T12:00:00Z"))
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/1/)
  })

  it("accepts a string date input", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T12:00:30Z"))
    expect(formatRelativeTime("2024-06-01T12:00:00Z")).toBe("just now")
  })

  it("returns exactly '1m' for exactly 60 seconds ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T12:01:00Z"))
    expect(formatRelativeTime(new Date("2024-06-01T12:00:00Z"))).toBe("1m")
  })

  it("returns exactly '1h' for exactly 60 minutes ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T13:00:00Z"))
    expect(formatRelativeTime(new Date("2024-06-01T12:00:00Z"))).toBe("1h")
  })
})
