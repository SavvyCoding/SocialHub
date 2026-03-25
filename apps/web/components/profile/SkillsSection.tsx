"use client"

import { useState } from "react"
import { Zap, Plus, X, ThumbsUp } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"

interface SkillsSectionProps {
  userId: string
}

export function SkillsSection({ userId }: SkillsSectionProps) {
  const { data: session } = useSession()
  const isOwner = session?.user?.id === userId
  const isLoggedIn = !!session
  const [newSkill, setNewSkill] = useState("")
  const [showInput, setShowInput] = useState(false)

  const utils = trpc.useUtils()
  const { data: skills } = trpc.profile.getSkills.useQuery({ userId })

  const addSkill = trpc.profile.addSkill.useMutation({
    onSuccess: () => {
      utils.profile.getSkills.invalidate({ userId })
      utils.profile.getCompleteness.invalidate()
      setNewSkill("")
      setShowInput(false)
    },
  })

  const removeSkill = trpc.profile.removeSkill.useMutation({
    onSuccess: () => utils.profile.getSkills.invalidate({ userId }),
  })

  const endorseSkill = trpc.profile.endorseSkill.useMutation({
    onSuccess: () => utils.profile.getSkills.invalidate({ userId }),
  })

  const handleAdd = () => {
    const name = newSkill.trim()
    if (!name) return
    addSkill.mutate({ name })
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Skills</h3>
        </div>
        {isOwner && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowInput(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
            placeholder="e.g. React, Product Management"
            maxLength={50}
            className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} disabled={addSkill.isPending || !newSkill.trim()}>
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowInput(false); setNewSkill("") }}>
            Cancel
          </Button>
        </div>
      )}

      {(!skills || skills.length === 0) ? (
        <p className="text-sm text-muted-foreground">
          {isOwner ? "Add skills to let others endorse your expertise." : "No skills listed."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((us) => {
            const endorseCount = us._count.endorsements
            const didEndorse = us.endorsements.length > 0
            return (
              <div
                key={us.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-muted/50 text-sm"
              >
                <span className="capitalize">{us.skill.name}</span>
                {endorseCount > 0 && (
                  <span className="text-xs text-muted-foreground font-medium">·{endorseCount}</span>
                )}
                {isLoggedIn && !isOwner && (
                  <button
                    onClick={() => endorseSkill.mutate({ userSkillId: us.id })}
                    className={`ml-0.5 transition-colors ${didEndorse ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                    title={didEndorse ? "Remove endorsement" : "Endorse"}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => removeSkill.mutate({ userSkillId: us.id })}
                    className="ml-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
