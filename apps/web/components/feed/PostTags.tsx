"use client"

import Link from "next/link"
import { Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PostTagsProps {
  tags: { tag: string }[]
  className?: string
}

export function PostTags({ tags, className }: PostTagsProps) {
  if (!tags || tags.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`} data-testid="post-tags">
      {tags.map(({ tag }) => (
        <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>
          <Badge
            variant="outline"
            className="gap-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
          >
            <Tag className="h-2.5 w-2.5" />
            {tag}
          </Badge>
        </Link>
      ))}
    </div>
  )
}
