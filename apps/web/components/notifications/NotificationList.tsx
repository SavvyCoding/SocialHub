"use client"

import { trpc } from "@/lib/trpc/client"
import { NotificationItem } from "./NotificationItem"
import { Button } from "@/components/ui/button"
import { Loader2, Bell } from "lucide-react"
import { NotificationSkeleton } from "@/components/ui/skeleton"

export function NotificationList() {
  const utils = trpc.useUtils()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.notification.getAll.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }
    )

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.getAll.invalidate()
      utils.notification.getCount.invalidate()
    },
  })

  const markAllRead = () => markRead.mutate({})

  const handleMarkRead = (id: string) => {
    markRead.mutate({ id })
  }

  const allNotifications = data?.pages.flatMap((p) => p.notifications) ?? []
  const hasUnread = allNotifications.some((n) => !n.isRead)

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card divide-y">
        <NotificationSkeleton />
        <NotificationSkeleton />
        <NotificationSkeleton />
        <NotificationSkeleton />
        <NotificationSkeleton />
      </div>
    )
  }

  if (allNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-7 w-7 text-primary" />
        </div>
        <p className="font-medium">No notifications yet</p>
        <p className="text-sm text-muted-foreground mt-1">When someone follows or interacts with you, you&apos;ll see it here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {hasUnread && (
        <div className="flex justify-end px-3 pb-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead}>
            Mark all as read
          </Button>
        </div>
      )}

      {allNotifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRead={handleMarkRead}
        />
      ))}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
