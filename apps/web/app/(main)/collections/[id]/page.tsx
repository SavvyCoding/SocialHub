"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ChevronLeft, Globe, Lock, Pencil, Trash2, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { PostCard } from "@/components/feed/PostCard"
import { PostCardSkeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.collection.getById.useInfiniteQuery(
      { id, limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }
    )

  const utils = trpc.useUtils()
  const updateMutation = trpc.collection.update.useMutation({
    onSuccess: () => { utils.collection.getById.invalidate({ id }); setEditOpen(false) },
  })
  const deleteMutation = trpc.collection.delete.useMutation({
    onSuccess: () => router.push("/collections"),
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editPublic, setEditPublic] = useState(true)

  const firstPage = data?.pages[0]
  const collection = firstPage?.collection
  const items = data?.pages.flatMap((p) => p.items) ?? []
  const isOwner = collection?.userId === session?.user?.id

  function openEdit() {
    if (!collection) return
    setEditName(collection.name)
    setEditDesc(collection.description ?? "")
    setEditPublic(collection.isPublic)
    setEditOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/collections" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        {isLoading ? (
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
        ) : (
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{collection?.name}</h1>
              {collection?.isPublic ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {isOwner && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm("Delete this collection?")) deleteMutation.mutate({ id }) }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {collection?.description && (
        <p className="text-sm text-muted-foreground -mt-2">{collection.description}</p>
      )}

      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 rounded-xl border bg-card">
          <p className="font-medium">No posts yet</p>
          <p className="text-sm text-muted-foreground">Save posts to this collection from the feed</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {items.map((item, i) => (
            <PostCard key={item.id} post={item.post as unknown as Parameters<typeof PostCard>[0]["post"]} style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }} />
          ))}
          {hasNextPage && (
            <div className="flex justify-center py-3">
              <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-primary">
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Public</Label>
              <Switch checked={editPublic} onCheckedChange={setEditPublic} />
            </div>
            <Button
              className="w-full"
              disabled={!editName.trim() || updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id, name: editName.trim(), description: editDesc.trim() || undefined, isPublic: editPublic })}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
