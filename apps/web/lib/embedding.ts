import { logger } from "@/lib/logger"

const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL ?? "http://localhost:11434/api/embed"
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text"
const EMBEDDING_DIMENSIONS = 384

export { EMBEDDING_DIMENSIONS }

export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.slice(0, 8000)

  const res = await fetch(EMBEDDING_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: trimmed }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Embedding API error ${res.status}: ${body}`)
  }

  const data = await res.json()

  // Support both Ollama and OpenAI-compatible response formats
  const vector: number[] = data.embeddings?.[0] ?? data.data?.[0]?.embedding ?? data.embedding
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Unexpected embedding response format")
  }

  if (vector.length !== EMBEDDING_DIMENSIONS) {
    logger.warn(
      { expected: EMBEDDING_DIMENSIONS, got: vector.length },
      "Embedding dimension mismatch — update EMBEDDING_DIMENSIONS in schema and lib/embedding.ts"
    )
  }

  return vector
}

export function buildPostEmbeddingText(post: {
  content: string | null
  author?: { name: string; username: string } | null
  hashtags?: { hashtag: { name: string } }[]
}): string {
  const parts: string[] = []
  if (post.content) parts.push(post.content)
  if (post.hashtags?.length) {
    parts.push(post.hashtags.map((h) => `#${h.hashtag.name}`).join(" "))
  }
  return parts.join("\n")
}

export function buildUserEmbeddingText(user: {
  name: string
  username: string
  bio: string | null
  location: string | null
  skills?: { skill: { name: string } }[]
  experiences?: { title: string; company: string }[]
}): string {
  const parts: string[] = [user.name]
  if (user.bio) parts.push(user.bio)
  if (user.location) parts.push(user.location)
  if (user.skills?.length) {
    parts.push("Skills: " + user.skills.map((s) => s.skill.name).join(", "))
  }
  if (user.experiences?.length) {
    parts.push(
      "Experience: " +
        user.experiences.map((e) => `${e.title} at ${e.company}`).join(", ")
    )
  }
  return parts.join("\n")
}
