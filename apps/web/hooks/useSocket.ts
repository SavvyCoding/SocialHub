"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"

export function useSocket() {
  const { data: session } = useSession()
  const socketRef = useRef<Socket | null>(null)
  const utils = trpc.useUtils()

  useEffect(() => {
    if (!session?.user?.id) return

    let socket: Socket | null = null
    let cancelled = false

    async function connect() {
      // Fetch a short-lived token from the server for socket auth
      const res = await fetch("/api/socket/token")
      if (!res.ok || cancelled) return
      const { token } = await res.json()
      if (cancelled) return

      const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
      })

      socketRef.current = socket

      socket.on("notification:new", () => {
        utils.notification.getCount.invalidate()
        utils.notification.getAll.invalidate()
      })
    }

    connect()

    return () => {
      cancelled = true
      socket?.disconnect()
      socketRef.current = null
    }
  }, [session?.user?.id, utils])

  return socketRef.current
}
