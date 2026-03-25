"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"

interface Education {
  id: string
  school: string
  degree: string | null
  field: string | null
  startYear: number
  endYear: number | null
}

interface EducationModalProps {
  userId: string
  education: Education | null
  onClose: () => void
}

export function EducationModal({ userId, education, onClose }: EducationModalProps) {
  const utils = trpc.useUtils()
  const isEdit = !!education

  const currentYear = new Date().getFullYear()

  const [form, setForm] = useState({
    school: education?.school ?? "",
    degree: education?.degree ?? "",
    field: education?.field ?? "",
    startYear: education?.startYear ?? currentYear - 4,
    endYear: education?.endYear ?? currentYear,
    isCurrent: !education?.endYear,
  })

  const invalidate = () => utils.profile.getEducations.invalidate({ userId })

  const add = trpc.profile.addEducation.useMutation({ onSuccess: () => { invalidate(); onClose() } })
  const update = trpc.profile.updateEducation.useMutation({ onSuccess: () => { invalidate(); onClose() } })

  const isPending = add.isPending || update.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      school: form.school,
      degree: form.degree || undefined,
      field: form.field || undefined,
      startYear: Number(form.startYear),
      endYear: form.isCurrent ? undefined : Number(form.endYear),
    }
    if (isEdit) {
      update.mutate({ id: education.id, ...payload, endYear: form.isCurrent ? null : Number(form.endYear) })
    } else {
      add.mutate(payload)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{isEdit ? "Edit Education" : "Add Education"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">School *</label>
            <input
              type="text"
              value={form.school}
              onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
              placeholder="e.g. MIT"
              className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Degree</label>
              <input
                type="text"
                value={form.degree}
                onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))}
                placeholder="e.g. B.S."
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Field of study</label>
              <input
                type="text"
                value={form.field}
                onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))}
                placeholder="e.g. Computer Science"
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Start year *</label>
              <input
                type="number"
                value={form.startYear}
                onChange={(e) => setForm((f) => ({ ...f, startYear: +e.target.value }))}
                min={1950}
                max={currentYear + 5}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">End year</label>
              <input
                type="number"
                value={form.isCurrent ? "" : form.endYear}
                onChange={(e) => setForm((f) => ({ ...f, endYear: +e.target.value }))}
                disabled={form.isCurrent}
                min={1950}
                max={currentYear + 10}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm((f) => ({ ...f, isCurrent: e.target.checked }))}
              className="rounded"
            />
            I currently study here
          </label>

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
