"use client"

import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useState } from "react"
import { MapPin, Link2, Calendar, BadgeCheck, Loader2, Pencil, MessageSquare, MoreHorizontal, VolumeX, Ban, Users, UserPlus, Feather } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { skipToken } from "@tanstack/react-query"
import { trpc } from "@/lib/trpc/client"
import { FollowButton } from "@/components/social/FollowButton"
import { PostCard } from "@/components/feed/PostCard"
import { ActivityHeatmap } from "@/components/profile/ActivityHeatmap"
import { ExperienceSection } from "@/components/profile/ExperienceSection"
import { EducationSection } from "@/components/profile/EducationSection"
import { SkillsSection } from "@/components/profile/SkillsSection"
import { ProfileCompleteness } from "@/components/profile/ProfileCompleteness"
import { formatRelativeTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProfileSkeleton, UserCardSkeleton } from "@/components/ui/skeleton"

const EditProfileModal = dynamic(
  () => import("@/components/profile/EditProfileModal").then((m) => ({ default: m.EditProfileModal })),
  { ssr: false }
)

type Tab = "overview" | "posts" | "professional" | "followers" | "following"

/**
 * Single component: ALL hooks are called unconditionally before any early return.
 * Conditional queries use `skipToken` to stay disabled without changing hook count.
 */
export function ProfileClient({ username }: { username: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("overview")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const { data: user, isLoading, isError } = trpc.user.getByUsername.useQuery({ username })

  const isCurrentUser = session?.user?.id === user?.id

  const { data: postsData } = trpc.post.getByUser.useInfiniteQuery(
    tab === "posts" ? { username, limit: 20 } : skipToken,
    { getNextPageParam: (last) => last.nextCursor }
  )

  const { data: followersData, hasNextPage: hasMoreFollowers, fetchNextPage: fetchMoreFollowers, isFetchingNextPage: isFetchingMoreFollowers } = trpc.follow.getFollowers.useInfiniteQuery(
    tab === "followers" && user ? { userId: user.id, limit: 20 } : skipToken,
    { getNextPageParam: (last) => last.nextCursor }
  )

  const { data: followingData, hasNextPage: hasMoreFollowing, fetchNextPage: fetchMoreFollowing, isFetchingNextPage: isFetchingMoreFollowing } = trpc.follow.getFollowing.useInfiniteQuery(
    tab === "following" && user ? { userId: user.id, limit: 20 } : skipToken,
    { getNextPageParam: (last) => last.nextCursor }
  )

  const { data: blockStatus, refetch: refetchBlockStatus } = trpc.block.getStatus.useQuery(
    session && user && !isCurrentUser ? { userId: user.id } : skipToken
  )

  const getOrCreateConv = trpc.message.getOrCreate.useMutation({
    onSuccess: (data) => router.push(`/messages/${data.id}`),
  })

  const blockMutation = trpc.block.block.useMutation({ onSuccess: () => refetchBlockStatus() })
  const unblockMutation = trpc.block.unblock.useMutation({ onSuccess: () => refetchBlockStatus() })
  const muteMutation = trpc.block.mute.useMutation({ onSuccess: () => refetchBlockStatus() })
  const unmuteMutation = trpc.block.unmute.useMutation({ onSuccess: () => refetchBlockStatus() })

  const { data: mutualFollowers } = trpc.user.getMutualFollowers.useQuery(
    session && user && !isCurrentUser ? { targetUserId: user.id } : skipToken
  )

  const followers = followersData?.pages?.flatMap((p) => p.followers ?? []) ?? undefined
  const following = followingData?.pages?.flatMap((p) => p.following ?? []) ?? undefined
  const posts = postsData?.pages.flatMap((p) => p.posts) ?? []

  // --- Early returns AFTER all hooks ---

  if (isLoading) return <ProfileSkeleton />

  if (isError || !user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">User not found.</p>
      </div>
    )
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "posts", label: "Posts" },
    { key: "professional", label: "Professional" },
    { key: "followers", label: "Followers" },
    { key: "following", label: "Following" },
  ]

  return (
    <div className="space-y-0">
      {/* Cover */}
      <div className="relative h-36 sm:h-52 rounded-t-xl bg-gradient-to-br from-primary/20 via-primary/10 to-muted overflow-hidden">
        {user.coverUrl && (
          <Image src={user.coverUrl} alt="Cover" fill className="object-cover" sizes="800px" priority />
        )}
      </div>

      {/* Profile header card */}
      <div className="rounded-b-xl border border-t-0 bg-card px-4 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-3">
          <div className="relative h-20 w-20 rounded-full border-4 border-background overflow-hidden bg-muted">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" sizes="80px" priority />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-bold">
                {user.name[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="pb-1 flex gap-2">
            {isCurrentUser ? (
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-1.5 rounded-full">
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </Button>
            ) : (
              <>
                {session && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => getOrCreateConv.mutate({ userId: user.id })}
                    disabled={getOrCreateConv.isPending || blockStatus?.isBlockedByThem}
                    className="gap-1.5 rounded-full"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message
                  </Button>
                )}
                {!blockStatus?.isBlocked && <FollowButton userId={user.id} size="default" />}
                {session && (
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => setShowMoreMenu((p) => !p)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {showMoreMenu && (
                      <div className="absolute right-0 top-10 z-20 rounded-xl border bg-popover shadow-lg min-w-[160px] overflow-hidden">
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                          onClick={() => {
                            setShowMoreMenu(false)
                            if (blockStatus?.isMuted) {
                              unmuteMutation.mutate({ userId: user.id })
                            } else {
                              muteMutation.mutate({ userId: user.id })
                            }
                          }}
                        >
                          <VolumeX className="h-4 w-4" />
                          {blockStatus?.isMuted ? "Unmute" : "Mute"} @{user.username}
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-accent transition-colors"
                          onClick={() => {
                            setShowMoreMenu(false)
                            if (blockStatus?.isBlocked) {
                              unblockMutation.mutate({ userId: user.id })
                            } else {
                              blockMutation.mutate({ userId: user.id })
                            }
                          }}
                        >
                          <Ban className="h-4 w-4" />
                          {blockStatus?.isBlocked ? "Unblock" : "Block"} @{user.username}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold">{user.name}</h1>
            {user.isVerified && <BadgeCheck className="h-5 w-5 text-primary" />}
          </div>
          <p className="text-muted-foreground text-sm">@{user.username}</p>
          {user.bio && <p className="text-sm mt-2 max-w-lg">{user.bio}</p>}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
          {user.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />{user.location}
            </span>
          )}
          {user.website && (
            <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
              <Link2 className="h-3.5 w-3.5" />
              {user.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Joined {formatRelativeTime(user.createdAt)}
          </span>
        </div>

        <div className="flex gap-4 mt-3 text-sm">
          <button onClick={() => setTab("following")} className={`hover:underline ${tab === "following" ? "font-semibold" : ""}`}>
            <span className="font-bold tabular-nums">{user._count.sentFollows}</span>{" "}
            <span className="text-muted-foreground">Following</span>
          </button>
          <button onClick={() => setTab("followers")} className={`hover:underline ${tab === "followers" ? "font-semibold" : ""}`}>
            <span className="font-bold tabular-nums">{user._count.receivedFollows}</span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </button>
          <span>
            <span className="font-bold tabular-nums">{user._count.posts}</span>{" "}
            <span className="text-muted-foreground">Posts</span>
          </span>
        </div>
      </div>

      {/* Profile completeness (owner only) */}
      {isCurrentUser && (
        <div className="mt-4">
          <ProfileCompleteness />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mt-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap relative",
              tab === t.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-4">
            <ActivityHeatmap userId={user.id} />

            {/* Mutual followers — only shown to viewers who are not the profile owner */}
            {!isCurrentUser && mutualFollowers && mutualFollowers.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Followed by people you follow</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mutualFollowers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.username}`}
                      className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-accent transition-colors"
                    >
                      {u.avatarUrl && (
                        <Image src={u.avatarUrl} alt={u.name} width={16} height={16} className="rounded-full object-cover" />
                      )}
                      <span className="font-medium">{u.name}</span>
                      {u.isVerified && <BadgeCheck className="h-3 w-3 text-primary" />}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <ExperienceSection userId={user.id} />
            <EducationSection userId={user.id} />
            <SkillsSection userId={user.id} />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Books", href: `/profile/${username}/books`, emoji: "\uD83D\uDCDA", desc: "Reading list & reviews" },
                { label: "Movies", href: `/profile/${username}/movies`, emoji: "\uD83C\uDFAC", desc: "Watchlist & ratings" },
                { label: "Places", href: `/profile/${username}/places`, emoji: "\uD83D\uDDFA\uFE0F", desc: "Travel map" },
                { label: "Goals", href: `/profile/${username}/goals`, emoji: "\uD83C\uDFAF", desc: "Achievements & targets" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="rounded-xl border bg-card p-4 hover:bg-accent/50 transition-colors hover:shadow-sm">
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Posts */}
        {tab === "posts" && (
          <>
            {posts.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Feather className="h-7 w-7 text-primary" />
                </div>
                <p className="font-medium">No posts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isCurrentUser ? "Share your first thought!" : `@${username} hasn't posted yet.`}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card divide-y">
                {posts.map((post, i) => (
                  <PostCard key={post.id} post={post} style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Professional */}
        {tab === "professional" && (
          <div className="space-y-4">
            <ExperienceSection userId={user.id} />
            <EducationSection userId={user.id} />
            <SkillsSection userId={user.id} />
          </div>
        )}

        {/* Followers */}
        {tab === "followers" && (
          <>
            {!followers ? (
              <div className="rounded-xl border bg-card divide-y">
                <UserCardSkeleton />
                <UserCardSkeleton />
                <UserCardSkeleton />
              </div>
            ) : followers.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <p className="font-medium">No followers yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isCurrentUser ? "Share content to attract followers!" : `@${username} doesn't have followers yet.`}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border bg-card divide-y">
                  {followers.map((f) => (
                    <div key={f.id} className="px-4 py-3 flex items-center gap-3 animate-fade-in-up">
                      <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {f.avatarUrl && <Image src={f.avatarUrl} alt={f.name} fill className="object-cover" sizes="36px" />}
                      </div>
                      <Link href={`/profile/${f.username}`} className="hover:underline">
                        <p className="text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">@{f.username}</p>
                      </Link>
                    </div>
                  ))}
                </div>
                {hasMoreFollowers && (
                  <div className="flex justify-center pt-2">
                    <Button variant="ghost" size="sm" onClick={() => fetchMoreFollowers()} disabled={isFetchingMoreFollowers} className="text-primary">
                      {isFetchingMoreFollowers ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Following */}
        {tab === "following" && (
          <>
            {!following ? (
              <div className="rounded-xl border bg-card divide-y">
                <UserCardSkeleton />
                <UserCardSkeleton />
                <UserCardSkeleton />
              </div>
            ) : following.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <UserPlus className="h-7 w-7 text-primary" />
                </div>
                <p className="font-medium">Not following anyone yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isCurrentUser ? "Discover people to follow!" : `@${username} isn't following anyone yet.`}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border bg-card divide-y">
                  {following.map((f) => (
                    <div key={f.id} className="px-4 py-3 flex items-center gap-3 animate-fade-in-up">
                      <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {f.avatarUrl && <Image src={f.avatarUrl} alt={f.name} fill className="object-cover" sizes="36px" />}
                      </div>
                      <Link href={`/profile/${f.username}`} className="hover:underline">
                        <p className="text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">@{f.username}</p>
                      </Link>
                    </div>
                  ))}
                </div>
                {hasMoreFollowing && (
                  <div className="flex justify-center pt-2">
                    <Button variant="ghost" size="sm" onClick={() => fetchMoreFollowing()} disabled={isFetchingMoreFollowing} className="text-primary">
                      {isFetchingMoreFollowing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {showEditModal && (
        <EditProfileModal user={user} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  )
}
