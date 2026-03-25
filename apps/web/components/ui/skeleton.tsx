import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/60 bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 bg-[length:200%_100%] animate-skeleton-shimmer",
        className
      )}
      {...props}
    />
  )
}

/** Skeleton matching PostCard shape */
function PostCardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
      <div className="flex gap-6 pt-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}

/** Skeleton matching a conversation row */
function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  )
}

/** Skeleton for a user card row */
function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  )
}

/** Skeleton for notification item */
function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/** Full profile skeleton */
function ProfileSkeleton() {
  return (
    <div className="space-y-0">
      <Skeleton className="h-36 sm:h-52 rounded-t-lg" />
      <div className="rounded-b-lg border border-t-0 bg-card px-4 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-3">
          <Skeleton className="h-20 w-20 rounded-full border-4 border-background" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-64 mt-2" />
        </div>
        <div className="flex gap-4 mt-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}

export {
  Skeleton,
  PostCardSkeleton,
  ConversationSkeleton,
  UserCardSkeleton,
  NotificationSkeleton,
  ProfileSkeleton,
}
