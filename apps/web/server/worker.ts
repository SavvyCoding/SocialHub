import { Worker, Queue } from "bullmq"
import { getQueueConnection } from "@/lib/queue"
import { processEmailNotification, type EmailNotificationPayload } from "./jobs/email-notification.job"
import { processMentions, type ProcessMentionsPayload } from "./jobs/process-mentions.job"
import { cleanupExpiredStories } from "./jobs/cleanup-expired-stories.job"
import { processEmbedding, type GenerateEmbeddingPayload } from "./jobs/generate-embedding.job"
import { publishScheduledPost, type PublishScheduledPostPayload } from "./jobs/publish-scheduled-post.job"
import { sendWeeklyDigests } from "./jobs/weekly-digest.job"
import { logger } from "@/lib/logger"

const connection = getQueueConnection()

// Email notification worker
const emailWorker = new Worker<EmailNotificationPayload>(
  "email-notifications",
  async (job) => {
    await processEmailNotification(job.data)
  },
  { connection, concurrency: 5 }
)

// Mention processing worker
const mentionWorker = new Worker<ProcessMentionsPayload>(
  "process-mentions",
  async (job) => {
    await processMentions(job.data)
  },
  { connection, concurrency: 3 }
)

// Story cleanup worker
const maintenanceWorker = new Worker(
  "maintenance",
  async (job) => {
    if (job.name === "cleanup-expired-stories") {
      await cleanupExpiredStories()
    }
  },
  { connection, concurrency: 1 }
)

// Embedding generation worker
const embeddingWorker = new Worker<GenerateEmbeddingPayload>(
  "generate-embeddings",
  async (job) => {
    await processEmbedding(job.data)
  },
  { connection, concurrency: 3 }
)

// Scheduled post publish worker
const publishWorker = new Worker<PublishScheduledPostPayload>(
  "publish-scheduled-posts",
  async (job) => {
    await publishScheduledPost(job.data)
  },
  { connection, concurrency: 2 }
)

// Weekly digest worker
const digestWorker = new Worker(
  "weekly-digest",
  async () => {
    await sendWeeklyDigests()
  },
  { connection, concurrency: 1 }
)

// Schedule weekly digest cron: every Monday at 09:00 UTC
const digestQueue = new Queue("weekly-digest", { connection })
digestQueue.add("send-weekly-digest", {}, {
  repeat: { pattern: "0 9 * * 1" },
  jobId: "weekly-digest-cron",
}).catch((err) => logger.warn({ err }, "Failed to register weekly digest cron"))

for (const worker of [emailWorker, mentionWorker, maintenanceWorker, embeddingWorker, publishWorker, digestWorker]) {
  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, queue: worker.name, err }, "Job failed")
  })
  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id, queue: worker.name }, "Job completed")
  })
}

logger.info("Workers started: email-notifications, process-mentions, maintenance, generate-embeddings, publish-scheduled-posts, weekly-digest")

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down workers...")
  await Promise.all([emailWorker.close(), mentionWorker.close(), maintenanceWorker.close(), embeddingWorker.close(), publishWorker.close(), digestWorker.close()])
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
