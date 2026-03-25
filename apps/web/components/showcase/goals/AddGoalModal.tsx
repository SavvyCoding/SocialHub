"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { trpc } from "@/lib/trpc/client"

const CATEGORIES = [
  "Health & Fitness",
  "Career & Education",
  "Finance",
  "Personal Growth",
  "Travel",
  "Relationships",
  "Creativity",
  "Other",
]

interface AddGoalModalProps {
  userId: string
  onClose: () => void
}

export function AddGoalModal({ userId, onClose }: AddGoalModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [saving, setSaving] = useState(false)
  const utils = trpc.useUtils()

  const addGoal = trpc.goal.addGoal.useMutation({
    onSuccess: () => {
      utils.goal.getGoals.invalidate({ userId })
      utils.goal.getStats.invalidate({ userId })
      onClose()
    },
    onError: () => setSaving(false),
  })

  const handleSubmit = () => {
    if (!title.trim()) return
    setSaving(true)
    addGoal.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      targetDate: targetDate || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Add a Goal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Goal *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Run a marathon"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="More details about this goal…"
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Category (optional)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
            >
              <option value="">— No category —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Target date */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Target Date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {saving ? "Adding…" : "Add Goal"}
          </button>
        </div>
      </div>
    </div>
  )
}
