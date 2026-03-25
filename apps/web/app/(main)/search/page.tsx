import { Suspense } from "react"
import type { Metadata } from "next"
import { Loader2 } from "lucide-react"
import { SearchClient } from "./SearchClient"

export const metadata: Metadata = { title: "Search" }

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  )
}
