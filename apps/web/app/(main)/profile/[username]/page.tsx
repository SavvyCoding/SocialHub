import type { Metadata } from "next"
import { db } from "@/lib/db"
import { ProfileClient } from "./ProfileClient"

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const user = await db.user.findUnique({
    where: { username },
    select: { name: true, bio: true, avatarUrl: true, username: true },
  })

  if (!user) return { title: `@${username}` }

  const title = `${user.name} (@${user.username})`
  const description = user.bio ?? `Follow ${user.name} on SocialHub.`

  return {
    title: `@${user.username}`,
    description,
    openGraph: {
      type: "profile",
      title,
      description,
      ...(user.avatarUrl
        ? { images: [{ url: user.avatarUrl, width: 400, height: 400, alt: user.name }] }
        : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(user.avatarUrl ? { images: [user.avatarUrl] } : {}),
    },
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return <ProfileClient username={username} />
}
