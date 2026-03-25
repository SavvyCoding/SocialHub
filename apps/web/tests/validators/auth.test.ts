import { describe, it, expect } from "vitest"
import { loginSchema, registerSchema } from "@/lib/validators/auth"

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "secret" }).success).toBe(true)
  })

  it("rejects invalid email format", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "secret" }).success).toBe(false)
  })

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "" }).success).toBe(false)
  })

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
  })
})

describe("registerSchema", () => {
  const valid = {
    name: "Alice Smith",
    username: "alice_99",
    email: "alice@example.com",
    password: "Password1",
    confirmPassword: "Password1",
  }

  it("accepts fully valid registration data", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it("rejects name shorter than 2 characters", () => {
    expect(registerSchema.safeParse({ ...valid, name: "A" }).success).toBe(false)
  })

  it("rejects name longer than 50 characters", () => {
    expect(registerSchema.safeParse({ ...valid, name: "A".repeat(51) }).success).toBe(false)
  })

  it("rejects username shorter than 3 characters", () => {
    expect(registerSchema.safeParse({ ...valid, username: "ab" }).success).toBe(false)
  })

  it("rejects username longer than 20 characters", () => {
    expect(registerSchema.safeParse({ ...valid, username: "a".repeat(21) }).success).toBe(false)
  })

  it("rejects username with special characters", () => {
    expect(registerSchema.safeParse({ ...valid, username: "alice!" }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, username: "alice@99" }).success).toBe(false)
  })

  it("accepts username with letters, numbers, and underscores", () => {
    expect(registerSchema.safeParse({ ...valid, username: "alice_99" }).success).toBe(true)
  })

  it("rejects invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-email" }).success).toBe(false)
  })

  it("rejects password shorter than 8 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "Short1", confirmPassword: "Short1" }).success).toBe(false)
  })

  it("rejects password without an uppercase letter", () => {
    expect(registerSchema.safeParse({ ...valid, password: "password1", confirmPassword: "password1" }).success).toBe(false)
  })

  it("rejects password without a digit", () => {
    expect(registerSchema.safeParse({ ...valid, password: "PasswordA", confirmPassword: "PasswordA" }).success).toBe(false)
  })

  it("rejects mismatched confirmPassword", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "Different1" })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."))
      expect(paths).toContain("confirmPassword")
    }
  })

  it("rejects password longer than 100 characters", () => {
    const longPw = "A1" + "a".repeat(99)
    expect(registerSchema.safeParse({ ...valid, password: longPw, confirmPassword: longPw }).success).toBe(false)
  })
})
