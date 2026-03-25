import { redirect } from "next/navigation"

// /feed is now merged into /posts
export default function FeedRedirect() {
  redirect("/posts")
}
