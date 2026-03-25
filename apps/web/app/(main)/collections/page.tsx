"use client"

import { useState } from "react"
import Link from "next/link"
import { Library, Plus, Lock, Globe, FolderOpen } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function CollectionsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? ""

  const { data: collections, isLoading, refetch } = trpc.collection.list.useQuery(
    { userId },
    { enabled: !!userId }
  )

  const createMutation = trpc.collection.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false); setName(""); setDesc(""); setIsPublic(true) },
  })

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [isPublic, setIsPublic] = useState(true)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5" />
          <h1 className="text-xl font-bold">Collections</h1>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : !collections?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 rounded-xl border bg-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <FolderOpen className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-medium">No collections yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a collection to save posts you love</p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 mt-2">
            <Plus className="h-4 w-4" />
            Create collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="group rounded-xl border bg-card p-4 hover:border-primary/40 hover:bg-accent/50 transition-colors"
            >
              {/* Thumbnail mosaic from first 4 posts with media */}
              <div className="mb-3 grid grid-cols-2 gap-0.5 h-20 rounded-lg overflow-hidden bg-muted">
                {col.items.filter((i) => i.post.mediaUrls.length > 0).slice(0, 4).map((item) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.post.mediaUrls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ))}
                {col.items.filter((i) => i.post.mediaUrls.length === 0).slice(0, Math.max(0, 4 - col.items.filter((i) => i.post.mediaUrls.length > 0).length)).map((item) => (
                  <div key={item.id} className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <Library className="h-4 w-4 text-primary/40" />
                  </div>
                ))}
                {col._count.items === 0 && (
                  <div className="col-span-2 row-span-2 bg-primary/10 flex items-center justify-center">
                    <Library className="h-6 w-6 text-primary/40" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate group-hover:text-primary transition-colors">{col.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{col._count.items} post{col._count.items !== 1 ? "s" : ""}</p>
                </div>
                {col.isPublic ? (
                  <Globe className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Collection name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input
                placeholder="What's this collection about?"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Public</Label>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <Button
              className="w-full"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: name.trim(), description: desc.trim() || undefined, isPublic })}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
