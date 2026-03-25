"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"

interface Experience {
  id: string
  title: string
  company: string
  location: string | null
  startDate: Date | string
  endDate: Date | string | null
  isCurrent: boolean
  description: string | null
}

interface ExperienceModalProps {
  userId: string
  experience: Experience | null
  onClose: () => void
}

function toInputDate(d: Date | string | null | undefined): string {
  if (!d) return ""
  return new Date(d).toISOString().slice(0, 7) // YYYY-MM
}

export function ExperienceModal({ userId, experience, onClose }: ExperienceModalProps) {
  const utils = trpc.useUtils()
  const isEdit = !!experience

  const [form, setForm] = useState({
    title: experience?.title ?? "",
    company: experience?.company ?? "",
    location: experience?.location ?? "",
    startDate: toInputDate(experience?.startDate),
    endDate: toInputDate(experience?.endDate),
    isCurrent: experience?.isCurrent ?? false,
    description: experience?.description ?? "",
  })

  const invalidate = () => utils.profile.getExperiences.invalidate({ userId })

  const add = trpc.profile.addExperience.useMutation({ onSuccess: () => { invalidate(); onClose() } })
  const update = trpc.profile.updateExperience.useMutation({ onSuccess: () => { invalidate(); onClose() } })

  const isPending = add.isPending || update.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title: form.title,
      company: form.company,
      location: form.location || undefined,
      startDate: form.startDate + "-01",
      endDate: form.isCurrent ? undefined : form.endDate ? form.endDate + "-01" : undefined,
      isCurrent: form.isCurrent,
      description: form.description || undefined,
    }
    if (isEdit) {
      update.mutate({ id: experience.id, ...payload })
    } else {
      add.mutate(payload)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{isEdit ? "Edit Experience" : "Add Experience"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: "Title *", key: "title", placeholder: "e.g. Software Engineer" },
            { label: "Company *", key: "company", placeholder: "e.g. Acme Corp" },
            { label: "Location", key: "location", placeholder: "e.g. San Francisco, CA" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-medium">{label}</label>
              <input
                type="text"
                value={form[key as keyof typeof form] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required={key === "title" || key === "company"}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Start *</label>
              <input
                type="month"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">End</label>
              <input
                type="month"
                value={form.isCurrent ? "" : form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                disabled={form.isCurrent}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm((f) => ({ ...f, isCurrent: e.target.checked, endDate: "" }))}
              className="rounded"
            />
            I currently work here
          </label>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe your role and achievements..."
              rows={3}
              maxLength={1000}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
