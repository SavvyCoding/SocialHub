import { redirect } from "next/navigation"

// /tweets was renamed to /posts
export default function TweetsRedirect() {
  redirect("/posts")
}
