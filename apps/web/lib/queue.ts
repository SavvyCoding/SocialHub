import { Queue, Worker, type JobsOptions } from "bullmq"
import IORedis from "ioredis"

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379"

// Dedicated connection for BullMQ (separate from app Redis to avoid blocking)
let _connection: IORedis | undefined

export function getQueueConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })
  }
  return _connection
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
}

export function createQueue(name: string) {
  return new Queue(name, {
    connection: getQueueConnection(),
    defaultJobOptions,
  })
}

export { Worker }
export type { JobsOptions }
