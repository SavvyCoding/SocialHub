import { TrendingFeedList } from "@/components/feed/TrendingFeedList"
import { TrendingUp } from "lucide-react"

export const metadata = {
  title: "Trending",
  description: "See what's trending in the last 24 hours",
}

export default function TrendingPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Trending</h1>
        <span className="text-sm text-muted-foreground ml-1">last 24 hours</span>
      </div>
      <TrendingFeedList />
    </div>
  )
}
