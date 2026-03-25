"use client"

import { useState, useRef } from "react"
import { X, Loader2, Camera } from "lucide-react"
import Image from "next/image"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"

interface EditProfileModalProps {
  user: {
    name: string
    bio: string | null
    location: string | null
    website: string | null
    avatarUrl: string | null
    coverUrl: string | null
  }
  onClose: () => void
}

async function uploadToCloudinary(file: File): Promise<string> {
  const sigRes = await fetch("/api/cloudinary/sign", { method: "POST" })
  if (!sigRes.ok) throw new Error("Failed to get upload signature")
  const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json()

  const formData = new FormData()
  formData.append("file", file)
  formData.append("signature", signature)
  formData.append("timestamp", timestamp)
  formData.append("api_key", apiKey)
  formData.append("folder", folder)

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  })
  if (!uploadRes.ok) throw new Error("Upload failed")
  const { secure_url } = await uploadRes.json()
  return secure_url
}

export function EditProfileModal({ user, onClose }: EditProfileModalProps) {
  const { update: updateSession } = useSession()
  const utils = trpc.useUtils()

  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio ?? "",
    location: user.location ?? "",
    website: user.website ?? "",
    avatarUrl: user.avatarUrl ?? "",
    coverUrl: user.coverUrl ?? "",
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const updateProfile = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getByUsername.invalidate()
      utils.user.me.invalidate()
      utils.profile.getCompleteness.invalidate()
      updateSession()
      onClose()
    },
  })

  const handleImageUpload = async (file: File, type: "avatar" | "cover") => {
    const setter = type === "avatar" ? setUploadingAvatar : setUploadingCover
    setter(true)
    try {
      const url = await uploadToCloudinary(file)
      setForm((f) => ({ ...f, [type === "avatar" ? "avatarUrl" : "coverUrl"]: url }))
    } catch {
      alert("Upload failed. Please try again.")
    } finally {
      setter(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate({
      name: form.name,
      bio: form.bio || undefined,
      location: form.location || undefined,
      website: form.website || undefined,
      avatarUrl: form.avatarUrl || undefined,
      coverUrl: form.coverUrl || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Edit profile</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Cover photo */}
          <div>
            <p className="text-sm font-medium mb-2">Cover photo</p>
            <div className="relative h-28 rounded-lg bg-gradient-to-br from-primary/20 to-muted overflow-hidden group">
              {form.coverUrl && (
                <Image src={form.coverUrl} alt="Cover" fill className="object-cover" sizes="500px" />
              )}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploadingCover
                  ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                  : <Camera className="h-6 w-6 text-white" />}
              </button>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "cover") }}
            />
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-muted group">
                {form.avatarUrl ? (
                  <Image src={form.avatarUrl} alt="Avatar" width={64} height={64} className="object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xl font-bold">
                    {form.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
              >
                {uploadingAvatar
                  ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                  : <Camera className="h-4 w-4 text-white" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Click avatar to change photo</p>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "avatar") }}
          />

          {/* Fields */}
          {[
            { label: "Name *", key: "name", placeholder: "Your name", type: "text", required: true },
            { label: "Bio", key: "bio", placeholder: "Tell people about yourself...", type: "textarea" },
            { label: "Location", key: "location", placeholder: "e.g. New York, NY", type: "text" },
            { label: "Website", key: "website", placeholder: "https://yoursite.com", type: "url" },
          ].map(({ label, key, placeholder, type, required }) => (
            <div key={key}>
              <label className="text-sm font-medium">{label}</label>
              {type === "textarea" ? (
                <textarea
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={3}
                  maxLength={200}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              ) : (
                <input
                  type={type}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required={required}
                  className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={updateProfile.isPending || uploadingAvatar || uploadingCover}>
              {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
