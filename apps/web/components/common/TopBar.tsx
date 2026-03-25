"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Search, LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { useSocket } from "@/hooks/useSocket"
import { cn } from "@/lib/utils"

export function TopBar() {
  const { data: session } = useSession()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  useSocket()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
      setQuery("")
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between max-w-[1280px] mx-auto px-3 md:px-4">
        {/* Logo */}
        <Link href="/posts" className="text-lg font-bold text-primary flex-shrink-0">
          SocialHub
        </Link>

        {/* Center search — hidden on mobile, shown md+ */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people, posts, or #hashtags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border bg-muted/50 pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
            />
          </div>
        </form>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Mobile search icon */}
          <Link
            href="/search"
            className="md:hidden p-2 rounded-full hover:bg-accent text-muted-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>

          {/* Avatar dropdown */}
          {session?.user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full hover:ring-2 hover:ring-primary/20 transition-all"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? ""} />
                  <AvatarFallback className="text-xs">{session.user.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                </Avatar>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-card shadow-lg py-1">
                    <Link
                      href={`/profile/${session.user.username}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors w-full text-left text-muted-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
