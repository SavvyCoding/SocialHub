import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = typeof date === "string" ? new Date(date) : date
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return "just now"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) ?? []
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))]
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@[a-zA-Z0-9_]+/g) ?? []
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))]
}
