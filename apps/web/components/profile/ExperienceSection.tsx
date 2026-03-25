"use client"

import { useState } from "react"
import { Briefcase, Plus, Pencil, Trash2, Building2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { ExperienceModal } from "./ExperienceModal"

interface ExperienceSectionProps {
  userId: string
}

function formatDateRange(start: Date | string, end: Date | string | null, isCurrent: boolean) {
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  return `${fmt(start)} – ${isCurrent ? "Present" : end ? fmt(end) : ""}`
}

export function ExperienceSection({ userId }: ExperienceSectionProps) {
  const { data: session } = useSession()
  const isOwner = session?.user?.id === userId
  const [editing, setEditing] = useState<string | "new" | null>(null)

  const utils = trpc.useUtils()
  const { data: experiences } = trpc.profile.getExperiences.useQuery({ userId })

  const deleteExp = trpc.profile.deleteExperience.useMutation({
    onSuccess: () => utils.profile.getExperiences.invalidate({ userId }),
  })

  const editTarget = editing && editing !== "new"
    ? experiences?.find((e) => e.id === editing) ?? null
    : null

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Experience</h3>
        </div>
        {isOwner && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(!experiences || experiences.length === 0) ? (
        <p className="text-sm text-muted-foreground">
          {isOwner ? "Add your work experience to showcase your career." : "No experience listed."}
        </p>
      ) : (
        <div className="space-y-4">
          {experiences.map((exp) => (
            <div key={exp.id} className="flex gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{exp.title}</p>
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                      {exp.location && ` · ${exp.location}`}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(exp.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteExp.mutate({ id: exp.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {exp.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{exp.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <ExperienceModal
          userId={userId}
          experience={editTarget}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
