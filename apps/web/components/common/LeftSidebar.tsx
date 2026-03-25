"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Home, Search, Bell, MessageSquare, Bookmark,
  BookOpen, Film, MapPin, Target, LogOut, Feather, Sun, Moon, Library,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/UserAvatar"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

interface LeftSidebarProps {
  onCompose: () => void
}

export function LeftSidebar({ onCompose }: LeftSidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  useEffect(() => { setMounted(true) }, [])

  const { data: notifCount } = trpc.notification.getCount.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 30_000,
  })
  const { data: msgCount } = trpc.message.getUnreadCount.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 15_000,
  })

  const username = session?.user?.username ?? ""

  const navItems = [
    { href: "/posts", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Explore" },
    { href: "/notifications", icon: Bell, label: "Notifications", badge: notifCount?.count },
    { href: "/messages", icon: MessageSquare, label: "Messages", badge: msgCount?.count },
    { href: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
    { href: "/collections", icon: Library, label: "Collections" },
  ]

  const showcaseItems = [
    { href: `/profile/${username}/books`, icon: BookOpen, label: "Books" },
    { href: `/profile/${username}/movies`, icon: Film, label: "Movies" },
    { href: `/profile/${username}/places`, icon: MapPin, label: "Places" },
    { href: `/profile/${username}/goals`, icon: Target, label: "Goals" },
  ]

  function isActive(href: string) {
    if (!mounted) return false
    return pathname === href || pathname.startsWith(href + "/")
  }

  if (!session) return null

  return (
    <aside className="hidden md:flex flex-col md:w-16 lg:w-60 flex-shrink-0 sticky top-12 h-[calc(100vh-3rem)] border-r bg-background">
      <nav className="flex-1 overflow-y-auto py-3 px-2 lg:px-3 space-y-1">
        {/* Navigation */}
        {navItems.map(({ href, icon: Icon, label, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors relative",
              "lg:rounded-lg",
              "md:justify-center lg:justify-start",
              isActive(href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            title={label}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="hidden lg:inline">{label}</span>
            {badge != null && badge > 0 && (
              <span className="absolute top-1 left-7 lg:static lg:ml-auto h-5 min-w-[20px] px-1 rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground flex items-center justify-center">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        ))}

        {/* Divider */}
        <div className="my-2 border-t" />

        {/* Showcase section */}
        <p className="hidden lg:block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">
          My Showcase
        </p>
        {showcaseItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
              "lg:rounded-lg",
              "md:justify-center lg:justify-start",
              isActive(href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            title={label}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        ))}

        {/* Compose button */}
        <div className="pt-3">
          <button
            onClick={onCompose}
            className={cn(
              "flex items-center justify-center gap-2 rounded-full font-semibold text-primary-foreground shadow-md",
              "bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:brightness-110 transition-all active:scale-95",
              "md:h-10 md:w-10 lg:h-auto lg:w-full lg:py-2.5 lg:px-4"
            )}
            title="New Post"
          >
            <Feather className="h-5 w-5 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline">Compose</span>
          </button>
        </div>
      </nav>

      {/* User card at bottom */}
      <div className="border-t p-2 lg:p-3">
        <Link
          href={`/profile/${username}`}
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent",
            "md:justify-center lg:justify-start"
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user?.image ?? ""} alt={session.user?.name ?? ""} />
            <AvatarFallback className="text-xs">{session.user?.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
          </Avatar>
          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-semibold truncate">{session.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">@{username}</p>
          </div>
        </Link>
        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-1",
              "md:justify-center lg:justify-start"
            )}
            title={mounted && theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden lg:inline">{mounted && theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-1",
              "md:justify-center lg:justify-start"
            )}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
