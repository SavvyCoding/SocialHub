import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MoviesClient } from "./MoviesClient"

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  return { title: `${username}'s Movies & Shows` }
}

export default async function MoviesPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return (
    <div className="space-y-4">
      <Link
        href={`/profile/${username}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
      >
        <ArrowLeft className="h-4 w-4" />
        @{username}
      </Link>
      <MoviesClient username={username} />
    </div>
  )
}
