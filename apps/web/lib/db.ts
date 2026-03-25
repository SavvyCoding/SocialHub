import { PrismaClient } from "@prisma/client"
import { readReplicas } from "@prisma/extension-read-replicas"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

  // Enable read replicas when DATABASE_READ_URL is configured
  if (process.env.DATABASE_READ_URL) {
    return client.$extends(
      readReplicas({ url: process.env.DATABASE_READ_URL })
    ) as unknown as PrismaClient
  }

  return client
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
