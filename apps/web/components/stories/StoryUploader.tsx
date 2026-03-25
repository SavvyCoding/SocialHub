"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { X, Upload, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"

interface StoryUploaderProps {
  onClose: () => void
}

export function StoryUploader({ onClose }: StoryUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE")
  const [caption, setCaption] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const utils = trpc.useUtils()
  const createStory = trpc.story.create.useMutation({
    onSuccess: () => {
      utils.story.getActiveForFeed.invalidate()
      onClose()
    },
  })

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setMediaType(file.type.startsWith("video") ? "VIDEO" : "IMAGE")
    setUploading(true)

    try {
      // Get Cloudinary signature
      const sigRes = await fetch("/api/cloudinary/sign", { method: "POST" })
      const sigData = await sigRes.json()
      if (!sigRes.ok) throw new Error(sigData.error ?? "Failed to get upload signature")
      const { signature, timestamp, cloudName, apiKey, folder } = sigData

      const formData = new FormData()
      formData.append("file", file)
      formData.append("signature", signature)
      formData.append("timestamp", timestamp)
      formData.append("api_key", apiKey)
      formData.append("folder", folder)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        throw new Error(errData?.error?.message ?? "Cloudinary upload failed")
      }
      const { secure_url } = await uploadRes.json()
      setMediaUrl(secure_url)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Upload failed. Please try again.")
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = () => {
    if (!mediaUrl) return
    createStory.mutate({ mediaUrl, mediaType, caption: caption || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="bg-background rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm p-5 md:p-6 space-y-4 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Add to Story</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Drop zone / preview */}
        {preview ? (
          <div className="relative h-64 md:aspect-[9/16] md:h-auto rounded-lg overflow-hidden bg-black">
            {mediaType === "VIDEO" ? (
              <video src={preview} className="h-full w-full object-cover" autoPlay muted loop playsInline />
            ) : (
              <Image src={preview} alt="Story preview" fill className="object-cover" sizes="320px" />
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
            <button
              className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
              onClick={() => { setPreview(null); setMediaUrl(null) }}
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            className="w-full h-48 md:aspect-[9/16] md:h-auto rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload photo or video</p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        <input
          type="text"
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={200}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <Button
          className="w-full"
          disabled={!mediaUrl || uploading || createStory.isPending}
          onClick={handleSubmit}
        >
          {createStory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Share Story
        </Button>
      </div>
    </div>
  )
}
