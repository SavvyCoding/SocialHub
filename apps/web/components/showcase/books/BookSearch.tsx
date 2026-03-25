"use client"

import { useState } from "react"
import Image from "next/image"
import { Search, Loader2, Plus, Check } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Button } from "@/components/ui/button"

const OL_COVER = (id: number, size: "S" | "M" | "L" = "M") =>
  `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`

const OL_WORK_ID = (key: string) => key.replace("/works/", "")

interface BookSearchProps {
  userId: string
  existingIds: Set<string>
}

export function BookSearch({ userId, existingIds }: BookSearchProps) {
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState<string | null>(null)
  const debouncedQ = useDebounce(query, 400)

  const utils = trpc.useUtils()

  const { data: results, isLoading } = trpc.book.search.useQuery(
    { q: debouncedQ },
    { enabled: debouncedQ.length >= 2 }
  )

  const addBook = trpc.book.addBook.useMutation({
    onSuccess: () => {
      utils.book.getShelf.invalidate({ userId })
      utils.book.getStats.invalidate({ userId })
      setAdding(null)
    },
    onError: () => setAdding(null),
  })

  const handleAdd = (doc: {
    key: string
    title: string
    author_name?: string[]
    cover_i?: number
    first_publish_year?: number
  }) => {
    const olWorkId = OL_WORK_ID(doc.key)
    setAdding(olWorkId)
    addBook.mutate({
      olWorkId,
      title: doc.title,
      author: doc.author_name?.[0],
      coverUrl: doc.cover_i ? OL_COVER(doc.cover_i) : undefined,
      publishYear: doc.first_publish_year,
      status: "WANT_TO_READ",
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a book by title or author..."
          className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results && results.length > 0 && query.length >= 2 && (
        <div className="rounded-lg border bg-card divide-y max-h-80 overflow-y-auto">
          {results.map((doc) => {
            const olWorkId = OL_WORK_ID(doc.key)
            const alreadyAdded = existingIds.has(olWorkId)
            return (
              <div key={doc.key} className="flex items-center gap-3 p-2.5">
                <div className="flex-shrink-0 w-9 h-14 rounded overflow-hidden bg-muted relative">
                  {doc.cover_i ? (
                    <Image
                      src={OL_COVER(doc.cover_i, "S")}
                      alt={doc.title}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  {doc.author_name?.[0] && (
                    <p className="text-xs text-muted-foreground truncate">{doc.author_name[0]}</p>
                  )}
                  {doc.first_publish_year && (
                    <p className="text-xs text-muted-foreground">{doc.first_publish_year}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={alreadyAdded ? "outline" : "default"}
                  className="flex-shrink-0 h-7 text-xs"
                  onClick={() => !alreadyAdded && handleAdd(doc)}
                  disabled={alreadyAdded || adding === olWorkId || addBook.isPending}
                >
                  {adding === olWorkId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : alreadyAdded ? (
                    <><Check className="h-3 w-3 mr-1" />Added</>
                  ) : (
                    <><Plus className="h-3 w-3 mr-1" />Add</>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {results?.length === 0 && debouncedQ.length >= 2 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">No books found for &ldquo;{debouncedQ}&rdquo;</p>
      )}
    </div>
  )
}
