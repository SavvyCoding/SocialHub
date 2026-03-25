import type { Metadata } from "next"
import { NotificationList } from "@/components/notifications/NotificationList"

export const metadata: Metadata = { title: "Notifications" }

export default function NotificationsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold px-1">Notifications</h1>
      <NotificationList />
    </div>
  )
}
