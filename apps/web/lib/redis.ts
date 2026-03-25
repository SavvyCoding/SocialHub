import Redis from "ioredis"

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient(): Redis {
  // Sentinel mode for production HA
  if (process.env.REDIS_SENTINELS) {
    const sentinels = process.env.REDIS_SENTINELS.split(",").map((s) => {
      const [host, port] = s.trim().split(":")
      return { host, port: parseInt(port ?? "26379", 10) }
    })
    return new Redis({
      sentinels,
      name: process.env.REDIS_SENTINEL_MASTER ?? "mymaster",
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  }

  // Single node (development / simple deployments)
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis
