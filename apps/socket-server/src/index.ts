import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import Redis from "ioredis"
import cors from "cors"
import { jwtVerify } from "jose"
import { createAdapter } from "@socket.io/redis-adapter"
import { logger } from "./logger"

const app = express()
app.use(cors({ origin: process.env.WEB_URL || "http://localhost:3000" }))
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_URL || "http://localhost:3000" },
})

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")
const subscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379")

// Redis adapter for horizontal scaling (multiple Socket.IO instances)
const pubClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379")
const subClient = pubClient.duplicate()
io.adapter(createAdapter(pubClient, subClient))

// NextAuth JWT secret for validating socket connections and internal endpoints
const AUTH_SECRET = process.env.AUTH_SECRET || ""

// Subscribe to notification and activity channels via Redis pub/sub
subscriber.psubscribe("notifications:*", "activity:*", (err) => {
  if (err) logger.error({ err }, "Redis subscribe error")
  else logger.info("Subscribed to notification and activity channels")
})

subscriber.on("pmessage", (_pattern, channel, message) => {
  const [prefix, userId] = channel.split(":")
  if (!userId) return
  if (prefix === "notifications") {
    io.to(userId).emit("notification:new", JSON.parse(message))
  } else if (prefix === "activity") {
    io.to(userId).emit("activity:new", JSON.parse(message))
  }
})

// Auth middleware — verify JWT token from NextAuth
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string
  if (!token) return next(new Error("Authentication required"))

  if (!AUTH_SECRET) {
    logger.error("AUTH_SECRET not configured — rejecting socket connection")
    return next(new Error("Server misconfigured"))
  }

  try {
    const secret = new TextEncoder().encode(AUTH_SECRET)
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
    const userId = payload.id as string | undefined
    if (!userId) return next(new Error("Invalid token"))
    socket.data.userId = userId
    next()
  } catch {
    return next(new Error("Invalid or expired token"))
  }
})

io.on("connection", (socket) => {
  const { userId } = socket.data as { userId: string }
  socket.join(userId)
  logger.info({ userId, clients: io.engine.clientsCount }, "User connected")

  socket.on("disconnect", () => {
    logger.info({ userId }, "User disconnected")
  })
})

// Internal REST endpoint for Next.js to push notifications
// Secured with JWT verification using AUTH_SECRET
app.post("/notify", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token || !AUTH_SECRET) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    const secret = new TextEncoder().encode(AUTH_SECRET)
    await jwtVerify(token, secret, { algorithms: ["HS256"] })
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
    return
  }

  const { recipientId, notification } = req.body as {
    recipientId: string
    notification: unknown
  }
  if (!recipientId) { res.status(400).json({ error: "recipientId required" }); return }
  io.to(recipientId).emit("notification:new", notification)
  res.json({ ok: true })
})

app.get("/health", (_req, res) => res.json({ ok: true, clients: io.engine.clientsCount }))

// ─── Graceful shutdown ──────────────────────────────────────────────────────
function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully")
  io.close(() => {
    subscriber.punsubscribe()
    Promise.all([subscriber.quit(), redis.quit(), pubClient.quit(), subClient.quit()]).catch(() => {})
    httpServer.close(() => {
      logger.info("Server closed")
      process.exit(0)
    })
  })
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10_000)
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, "Socket.IO server running")
})
