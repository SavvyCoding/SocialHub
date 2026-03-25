"use client"

import { useState } from "react"
import { GraduationCap, Plus, Pencil, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { EducationModal } from "./EducationModal"

interface EducationSectionProps {
  userId: string
}

export function EducationSection({ userId }: EducationSectionProps) {
  const { data: session } = useSession()
  const isOwner = session?.user?.id === userId
  const [editing, setEditing] = useState<string | "new" | null>(null)

  const utils = trpc.useUtils()
  const { data: educations } = trpc.profile.getEducations.useQuery({ userId })

  const deleteEdu = trpc.profile.deleteEducation.useMutation({
    onSuccess: () => utils.profile.getEducations.invalidate({ userId }),
  })

  const editTarget = editing && editing !== "new"
    ? educations?.find((e) => e.id === editing) ?? null
    : null

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Education</h3>
        </div>
        {isOwner && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(!educations || educations.length === 0) ? (
        <p className="text-sm text-muted-foreground">
          {isOwner ? "Add your education background." : "No education listed."}
        </p>
      ) : (
        <div className="space-y-4">
          {educations.map((edu) => (
            <div key={edu.id} className="flex gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{edu.school}</p>
                    {(edu.degree || edu.field) && (
                      <p className="text-sm text-muted-foreground">
                        {[edu.degree, edu.field].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {edu.startYear} – {edu.endYear ?? "Present"}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(edu.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteEdu.mutate({ id: edu.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <EducationModal
          userId={userId}
          education={editTarget}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
