"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ImagePlus, X, Loader2, Globe, Users, Lock } from "lucide-react"
import Image from "next/image"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"

type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE"

const VISIBILITY_OPTIONS: { value: Visibility; label: string; Icon: React.ElementType }[] = [
  { value: "PUBLIC", label: "Everyone", Icon: Globe },
  { value: "FOLLOWERS", label: "Followers", Icon: Users },
  { value: "PRIVATE", label: "Only me", Icon: Lock },
]

interface PostComposerProps {
  onPostCreated?: () => void
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const { data: session } = useSession()
  const [content, setContent] = useState("")
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC")
  const [showVisibility, setShowVisibility] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const utils = trpc.useUtils()

  const mentionSuggestions = trpc.user.getMentionSuggestions.useQuery(
    { q: mentionQuery ?? "" },
    { enabled: mentionQuery !== null && mentionQuery.length > 0 }
  )

  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      setContent("")
      setMediaUrls([])
      setPostError(null)
      setMentionQuery(null)
      utils.post.getFeed.invalidate()
      onPostCreated?.()
    },
    onError: (err) => {
      setPostError(err.message ?? "Failed to post. Please try again.")
    },
  })

  // Detect @mention as user types
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setContent(val)

      const pos = e.target.selectionStart ?? val.length
      const beforeCursor = val.slice(0, pos)
      const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/)
      if (match) {
        setMentionQuery(match[1])
        setMentionRange({ start: pos - match[0].length, end: pos })
      } else {
        setMentionQuery(null)
        setMentionRange(null)
      }
    },
    []
  )

  // Close mention dropdown on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMentionQuery(null)
        setMentionRange(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const insertMention = (username: string) => {
    if (!mentionRange) return
    const before = content.slice(0, mentionRange.start)
    const after = content.slice(mentionRange.end)
    const newContent = `${before}@${username} ${after}`
    setContent(newContent)
    setMentionQuery(null)
    setMentionRange(null)
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + username.length + 2
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (mediaUrls.length + files.length > 4) {
      alert("Maximum 4 images per post")
      return
    }

    setIsUploading(true)
    try {
      const uploads = files.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("upload_preset", "social_platform")
        formData.append("folder", "posts")

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        )
        const data = await res.json()
        return data.secure_url as string
      })
      const urls = await Promise.all(uploads)
      setMediaUrls((prev) => [...prev, ...urls])
    } catch {
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [mediaUrls.length])

  const removeImage = useCallback((index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = useCallback(() => {
    if (!content.trim() && mediaUrls.length === 0) return
    createPost.mutate({ content: content.trim() || undefined, mediaUrls, visibility })
  }, [content, mediaUrls, visibility, createPost])

  const charCount = content.length
  const isOverLimit = charCount > 2000
  const currentVisOption = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!

  if (!session) return null

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={session.user?.image ?? ""} alt={session.user?.name ?? ""} />
          <AvatarFallback>{session.user?.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3 relative">
          <Textarea
            ref={textareaRef}
            placeholder="What's on your mind?"
            value={content}
            onChange={handleContentChange}
            className="border-0 p-0 focus-visible:ring-0 text-base resize-none min-h-[80px]"
          />

          {/* @mention dropdown */}
          {mentionQuery !== null && mentionQuery.length > 0 && (mentionSuggestions.data?.length ?? 0) > 0 && (
            <div className="absolute top-full left-0 z-50 w-64 rounded-md border bg-popover shadow-lg overflow-hidden">
              {mentionSuggestions.data?.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(user.username)
                  }}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={user.avatarUrl ?? ""} alt={user.name} />
                    <AvatarFallback className="text-[10px]">{user.name[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Image previews */}
          {mediaUrls.length > 0 && (
            <div className={`grid gap-2 ${mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {mediaUrls.map((url, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden aspect-video">
                  <Image src={url} alt={`Upload ${i + 1}`} fill className="object-cover" sizes="300px" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {postError && <p className="text-xs text-destructive">{postError}</p>}

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-1">
              {/* Image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={isUploading || mediaUrls.length >= 4}
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-primary"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
              </Button>

              {/* Visibility picker */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="gap-1 text-muted-foreground hover:text-primary text-xs"
                  onClick={() => setShowVisibility((p) => !p)}
                >
                  <currentVisOption.Icon className="h-3.5 w-3.5" />
                  {currentVisOption.label}
                </Button>
                {showVisibility && (
                  <div className="absolute bottom-full left-0 mb-1 z-50 rounded-md border bg-popover shadow-md min-w-[140px] overflow-hidden">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent ${visibility === opt.value ? "text-primary font-medium" : ""}`}
                        onClick={() => {
                          setVisibility(opt.value)
                          setShowVisibility(false)
                        }}
                      >
                        <opt.Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {charCount > 1800 && (
                <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                  {2000 - charCount}
                </span>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={
                  createPost.isPending ||
                  isOverLimit ||
                  (!content.trim() && mediaUrls.length === 0)
                }
              >
                {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
